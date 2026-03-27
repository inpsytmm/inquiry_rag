import { Router, type IRouter } from "express";
import { AskBody, AskResponse } from "@workspace/api-zod";
import OpenAI from "openai";
import pg from "pg";

const router: IRouter = Router();

/** pgvector 임베딩이 저장된 테이블명 */
const TABLE_NAME = "inquiry_case_ai_chunks";

/** 텍스트(원문) 컬럼명 */
const TEXT_COLUMN = "chunk_text_normalized";

/** 유사도 검색 시 반환할 최대 문서 수 */
const TOP_K = parseInt(process.env.RAG_TOP_K ?? "15", 10);

/** OpenAI 임베딩 모델 */
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

/** OpenAI 답변 생성 모델 */
const CHAT_MODEL = process.env.CHAT_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dbUrl = process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  throw new Error("NEON_DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

router.post("/ask", async (req, res) => {
  const parseResult = AskBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "질문을 입력해주세요." });
    return;
  }

  const { question } = parseResult.data;

  try {
    req.log.info({ question }, "임베딩 생성 시작");
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });
    const questionEmbedding = embeddingResponse.data[0].embedding;

    req.log.info("pgvector 유사 문서 검색 시작");
    const vectorStr = `[${questionEmbedding.join(",")}]`;

    const searchQuery = `
  SELECT
    c.id::text AS id,
    c.chunk_text AS content,
    (1 - (e.embedding <=> $1::vector)) * 0.7
    + ts_rank(
        to_tsvector('simple', c.chunk_text_normalized),
        plainto_tsquery('simple', $2)
      ) * 0.3 AS similarity
  FROM ${TABLE_NAME} c
  JOIN inquiry_case_ai_chunk_embeddings e
    ON e.chunk_id = c.id
    AND e.embedding_model = '${EMBEDDING_MODEL}'
  WHERE c.chunk_type = 'merged'
  ORDER BY similarity DESC
  LIMIT ${TOP_K}
`;

const dbResult = await pool.query(searchQuery, [vectorStr, question]);
    const chunks = dbResult.rows as Array<{
      id: string;
      content: string;
      similarity: number;
    }>;

    req.log.info({ count: chunks.length }, "유사 문서 검색 완료");
    req.log.info({ scores: chunks.map(c => ({ id: c.id, similarity: c.similarity }))
    }, "유사도 점수");

    const context = chunks
      .map((chunk, i) => `[문서 ${i + 1}]\n${chunk.content}`)
      .join("\n\n---\n\n");

    req.log.info("LLM 답변 생성 시작");
    const systemPrompt = `당신은 고객 문의 전문 AI 어시스턴트입니다.
아래 제공된 참고 문서를 기반으로 사용자의 질문에 정확하고 친절하게 한국어로 답변하세요.
참고 문서에 관련 내용이 없는 경우, "제공된 문서에서 관련 정보를 찾을 수 없습니다."라고 솔직하게 답변하세요.
답변은 명확하고 간결하게 작성하세요.`;

    const userPrompt = `[참고 문서]
${context}

[사용자 질문]
${question}

위 참고 문서를 바탕으로 질문에 답변해 주세요.`;

    const chatResponse = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const answer =
      chatResponse.choices[0]?.message?.content ?? "답변을 생성할 수 없습니다.";

    req.log.info("RAG 답변 생성 완료");

    const response = AskResponse.parse({ answer, chunks });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "RAG 처리 중 오류 발생");
    res.status(500).json({
      error: "답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
});

export default router;