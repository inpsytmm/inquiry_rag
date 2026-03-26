import { useState, useRef, useEffect } from "react";
import { useAsk } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Bot,
  Database,
  Info,
  ChevronRight,
  AlertCircle,
  Briefcase
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
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [question]);

  const askMutation = useAsk();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    
    askMutation.mutate({ data: { question: question.trim() } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isPending = askMutation.isPending;
  const data = askMutation.data;
  const isError = askMutation.isError;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none opacity-50" />
      <div className="absolute top-48 -left-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none opacity-50" />

      {/* Corporate Navbar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise 지식 검색 AI</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 sm:py-16 flex flex-col gap-8 z-10">
        
        {/* Hero Section */}
        <section className="text-center space-y-4 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              사내 규정 및 가이드라인 특화
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              무엇이든 물어보세요.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              수천 건의 사내 문서와 규정 데이터를 바탕으로 <br className="hidden sm:block" />가장 정확하고 빠른 답변을 제공합니다.
            </p>
          </motion.div>
        </section>

        {/* Input Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-400/20 to-primary/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <Card className="relative bg-white shadow-xl shadow-black/5 rounded-2xl border-border/60 overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
            <form onSubmit={handleSubmit} className="p-2">
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="궁금한 내용을 입력하세요... (예: 2025년도 연차 이월 규정이 어떻게 되나요?)"
                className="min-h-[120px] resize-none border-0 focus-visible:ring-0 shadow-none text-base md:text-lg p-4 bg-transparent placeholder:text-slate-400"
                disabled={isPending}
              />
              <div className="flex items-center justify-between p-2 pt-0">
                <div className="flex items-center text-xs text-slate-400 ml-2">
                  <Info className="w-3.5 h-3.5 mr-1" />
                  <span>Enter를 눌러 질문 전송, Shift + Enter로 줄바꿈</span>
                </div>
                <Button
                  type="submit"
                  disabled={!question.trim() || isPending}
                  className="rounded-xl px-6 py-5 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      검색 중...
                    </>
                  ) : (
                    <>
                      질문하기
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full"
            >
              <Card className="p-8 border-border/50 shadow-sm rounded-2xl bg-white overflow-hidden">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 animate-pulse">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-4 mt-1">
                    <p className="text-sm font-semibold text-primary animate-pulse">
                      사내 문서를 분석하고 최적의 답변을 생성 중입니다...
                    </p>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 rounded-md w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-slate-100 rounded-md w-full animate-pulse"></div>
                      <div className="h-4 bg-slate-100 rounded-md w-5/6 animate-pulse"></div>
                      <div className="h-4 bg-slate-100 rounded-md w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full"
            >
              <Card className="p-6 border-red-200 bg-red-50/50 shadow-sm rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-red-800">오류가 발생했습니다</h3>
                    <p className="text-red-600 mt-1">
                      요청을 처리하는 도중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {data && !isPending && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex flex-col gap-6"
            >
              {/* Answer Card */}
              <Card className="p-6 sm:p-8 border-border/50 shadow-lg shadow-black/5 rounded-2xl bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI 답변</h3>
                  </div>
                </div>
                
                <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-slate-700">
                  <p className="whitespace-pre-wrap text-base sm:text-lg">{data.answer}</p>
                </div>
              </Card>

              {/* Retrieved Chunks (Sources) */}
              {data.chunks && data.chunks.length > 0 && (
                <Card className="border-border/50 shadow-sm rounded-2xl bg-white overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="sources" className="border-none">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 transition-colors [&[data-state=open]>div>svg]:rotate-90">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Database className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-base">참고 문서 ({data.chunks.length}건)</span>
                          <ChevronRight className="w-4 h-4 ml-auto text-slate-400 transition-transform duration-200" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="flex flex-col gap-4">
                          {data.chunks.map((chunk, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              key={chunk.id} 
                              className="group relative rounded-xl border border-border/60 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant="outline" className="bg-white text-slate-600 font-mono text-xs border-slate-200">
                                  Doc ID: {chunk.id.substring(0, 8)}...
                                </Badge>
                                <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-none px-2 py-0.5 text-xs font-semibold">
                                  관련도 {Math.round(chunk.similarity * 100)}%
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                                {chunk.content}
                              </p>
                            </motion.div>
                          ))}
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
