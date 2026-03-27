import { Router, type IRouter } from "express";
import { AskBody, AskResponse } from "@workspace/api-zod";
import OpenAI from "openai";
import pg from "pg";

const router: IRouter = Router();

// ──────────────────────────────────────────────
// ★ 수정 포인트: 아래 상수를 여러분의 DB 구조에 맞게 변경하세요
// ──────────────────────────────────────────────

/** pgvector 임베딩이 저장된 테이블명 */
const TABLE_NAME = "inquiry_case_ai_chunks";

/** 텍스트(원문) 컬럼명 */
const TEXT_COLUMN = "chunk_text";

/** 임베딩 벡터 컬럼명 */
const EMBEDDING_COLUMN = "embedding";

/** 유사도 검색 시 반환할 최대 문서 수 */
const TOP_K = parseInt(process.env.RAG_TOP_K ?? "5", 10);

/** 유사도 임계값 - 이 값 미만의 청크는 검색 결과에서 제외 */
const SIMILARITY_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD ?? "0.45");

/** OpenAI 임베딩 모델 */
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

/** OpenAI 답변 생성 모델 */
const CHAT_MODEL = process.env.CHAT_MODEL ?? "gpt-4o-mini";

// ──────────────────────────────────────────────
// OpenAI 클라이언트 초기화
// ──────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ──────────────────────────────────────────────
// PostgreSQL(Neon) 연결 풀
// NEON_DATABASE_URL 환경변수를 사용합니다.
// ──────────────────────────────────────────────
const dbUrl = process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  throw new Error("NEON_DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

// ──────────────────────────────────────────────
// POST /api/ask — RAG 질의응답 엔드포인트
// ──────────────────────────────────────────────
router.post("/ask", async (req, res) => {
  // 1. 요청 본문 검증
  const parseResult = AskBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "질문을 입력해주세요." });
    return;
  }

  const { question } = parseResult.data;

  try {
    // 2. 질문을 임베딩 벡터로 변환 (OpenAI Embeddings API)
    req.log.info({ question }, "임베딩 생성 시작");
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });
    const questionEmbedding = embeddingResponse.data[0].embedding;

    // 3. pgvector 코사인 유사도로 유사한 문서 TOP_K개 검색
    //    inquiry_case_ai_chunk_embeddings 테이블의 embedding과
    //    inquiry_case_ai_chunks 테이블의 chunk_text를 JOIN하여 검색합니다.
    //    <=> 연산자: cosine distance (값이 작을수록 유사)
    //    1 - distance = similarity (값이 클수록 유사)
    req.log.info("pgvector 유사 문서 검색 시작");
    const vectorStr = `[${questionEmbedding.join(",")}]`;
    const searchQuery = `
  SELECT
    c.id::text AS id,
    c.${TEXT_COLUMN} AS content,
    1 - (e.${EMBEDDING_COLUMN} <=> $1::vector) AS similarity
  FROM ${TABLE_NAME} c
  JOIN inquiry_case_ai_chunk_embeddings e 
    ON e.chunk_id = c.id
    AND e.embedding_model = '${EMBEDDING_MODEL}'
  WHERE c.chunk_type = 'merged'
    AND 1 - (e.${EMBEDDING_COLUMN} <=> $1::vector) >= ${SIMILARITY_THRESHOLD}
  ORDER BY e.${EMBEDDING_COLUMN} <=> $1::vector
  LIMIT ${TOP_K}
`;
    const dbResult = await pool.query(searchQuery, [vectorStr]);
    const chunks = dbResult.rows as Array<{
      id: string;
      content: string;
      similarity: number;
    }>;

    req.log.info({ count: chunks.length }, "유사 문서 검색 완료");

    // 4. 검색된 문서들로 컨텍스트 구성
    const context = chunks
      .map((chunk, i) => `[문서 ${i + 1}]\n${chunk.content}`)
      .join("\n\n---\n\n");

    // 5. 컨텍스트 + 질문을 LLM에 전달하여 답변 생성
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

    // 6. 답변과 검색된 청크 반환
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
