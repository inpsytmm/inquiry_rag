import { useState, useRef, useEffect } from "react";
import { useAsk } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Search,
  AlertCircle,
  ChevronDown,
  FileText,
  Sparkles,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220,
      )}px`;
    }
  }, [question]);

  const askMutation = useAsk();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || askMutation.isPending) return;

    const trimmed = question.trim();
    setQuestion("");
    setExpandedChunks(new Set());
    askMutation.mutate({ data: { question: trimmed } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleChunk = (id: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isPending = askMutation.isPending;
  const data = askMutation.data;
  const isError = askMutation.isError;

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight">
                인싸이트 지식엔진
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col px-5 pb-16 pt-12 sm:px-6 sm:pt-20">
        <section className="mb-10 text-center sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Badge className="mb-5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-none hover:bg-white">
              사내 문의 데이터를 기반으로 답변합니다
            </Badge>

            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              찾지 말고,
              <br className="sm:hidden" /> 물어보세요
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              사내 1:1 문의 데이터를 바탕으로 필요한 답을 빠르게 정리해드립니다.
            </p>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-8"
        >
          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <form onSubmit={handleSubmit} className="p-3 sm:p-4">
              <label htmlFor="question-input" className="sr-only">
                질문 입력
              </label>
              <Textarea
                id="question-input"
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 세금계산서 발행일 변경 가능 여부가 궁금해요"
                className="min-h-[132px] resize-none border-0 bg-transparent px-3 py-3 text-[15px] leading-7 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0 sm:px-4 sm:text-base"
                disabled={isPending}
              />

              <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                <p className="pl-2 text-xs text-slate-400 sm:pl-2">
                  Enter로 전송 · Shift + Enter로 줄바꿈
                </p>

                <Button
                  type="submit"
                  disabled={!question.trim() || isPending}
                  className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-none hover:bg-slate-800 disabled:bg-slate-300 sm:px-6"
                >
                  {isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      답변 생성 중
                    </>
                  ) : (
                    <>
                      질문하기
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.section>

        <AnimatePresence mode="wait">
          {isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                    <Search className="h-5 w-5 text-slate-700" />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      관련 내용을 찾고 답변을 정리하고 있습니다
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      문의 데이터와 유사 문서를 검색하는 중입니다.
                    </p>

                    <div className="mt-5 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-100" />
                      <div className="h-4 w-full animate-pulse rounded-md bg-slate-100" />
                      <div className="h-4 w-5/6 animate-pulse rounded-md bg-slate-100" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      요청을 처리하지 못했습니다
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      일시적인 문제일 수 있습니다. 잠시 후 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {data && !isPending && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-5"
            >
              <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                      AI 답변
                    </h3>
                    <p className="text-sm text-slate-400">
                      문의 데이터 기반 응답
                    </p>
                  </div>
                </div>

                <div className="prose prose-slate prose-sm sm:prose-base max-w-none prose-p:leading-7 prose-li:leading-7 prose-headings:font-semibold">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {data.answer}
                  </ReactMarkdown>
                </div>
              </Card>

              {data.chunks && data.chunks.length > 0 && (
                <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="sources" className="border-none">
                      <AccordionTrigger className="group px-5 py-4 hover:no-underline hover:bg-slate-50 sm:px-6">
                        <div className="flex w-full items-center gap-3 text-left">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100">
                            <FileText className="h-4 w-4 text-slate-700" />
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 sm:text-base">
                              참고 문서
                            </p>
                            <p className="text-xs text-slate-400">
                              {data.chunks.length}건의 유사 문서를 찾았습니다
                            </p>
                          </div>

                          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                        <div className="flex flex-col gap-3">
                          {data.chunks.map((chunk, idx) => {
                            const isExpanded = expandedChunks.has(chunk.id);
                            return (
                              <motion.div
                                key={chunk.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="mb-3 flex items-center justify-end gap-3">
                                  <Badge className="rounded-full border-0 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-900">
                                    관련도 {Math.round(chunk.similarity * 100)}%
                                  </Badge>
                                </div>

                                <p
                                  className={`text-sm leading-6 text-slate-600 ${
                                    isExpanded ? "" : "line-clamp-4"
                                  }`}
                                >
                                  {chunk.content}
                                </p>

                                {chunk.content.split("\n").length > 4 ||
                                chunk.content.length > 300 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleChunk(chunk.id)}
                                    className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        접기
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        전체 보기
                                      </>
                                    )}
                                  </button>
                                ) : null}
                              </motion.div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
