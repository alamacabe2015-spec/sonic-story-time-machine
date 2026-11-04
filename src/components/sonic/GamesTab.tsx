import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, Gamepad2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { answerQuiz, startQuiz, type QuizState } from "@/lib/games.functions";
import tails from "@/assets/quiz-tails.jpg";
import knuckles from "@/assets/quiz-knuckles.jpg";
import emerald from "@/assets/quiz-emerald.jpg";
import sonic from "@/assets/sonic-face.png";
import { GAME_MODES, type GameMode } from "@/lib/games";
import { useAchievements } from "@/lib/use-achievements";

const images: Record<string, string> = { tails, knuckles, emerald, sonic };

export function GamesTab({ coins, onReward, onShop }: { coins: number; onReward: () => void; onShop: () => void }) {
  const start = useServerFn(startQuiz);
  const answer = useServerFn(answerQuiz);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [feedback, setFeedback] = useState<QuizState | null>(null);
  const [busy, setBusy] = useState(false);
  const [earned, setEarned] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<GameMode>("easy");
  const { record } = useAchievements();

  async function begin() {
    setBusy(true);
    try { setQuiz(await start({ data: { mode } })); setFeedback(null); setEarned(0); setSelected(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo empezar"); }
    finally { setBusy(false); }
  }
  async function choose(choice: number) {
    if (!quiz || busy || feedback) return;
    setBusy(true); setSelected(choice);
    try {
      const result = await answer({ data: { sessionId: quiz.sessionId, position: quiz.position, choice } });
      setFeedback(result); setEarned((v) => v + (result.earned ?? 0)); onReward();
      if (!result.question) {
        void record("quizzes_played");
        void record(`${mode}_played`);
        if (result.correct) void record("correct_answers", { amount: result.correct });
        if (result.correct === result.total) void record("perfect_rounds");
      }
    } catch (e) { setSelected(null); toast.error(e instanceof Error ? e.message : "No se pudo guardar tu respuesta"); }
    finally { setBusy(false); }
  }

  return <section className="space-y-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-2xl text-primary">Juegos</h2><span className="flex items-center gap-2 font-extrabold"><Coins className="text-ring-gold" />{coins}</span></div>
    {!quiz ? <div className="space-y-5 text-center py-5">
      <img src={tails} alt="Tails" width={816} height={816} className="mx-auto w-32 h-32 rounded-lg object-contain" />
      <h3 className="text-2xl">Los retos de Sonic</h3>
      <div className="grid grid-cols-2 gap-3 text-left">{GAME_MODES.map((m) => <Button key={m.id} variant={mode === m.id ? "secondary" : "outline"} aria-pressed={mode === m.id} onClick={() => setMode(m.id)} disabled={busy} className="h-auto min-h-28 flex-col items-start whitespace-normal gap-1 p-3"><span className="text-lg">{m.label}</span><span className="text-xs">{m.zone}</span><span className="text-xs">{m.total} preguntas</span><span className="flex items-center gap-1 text-xs"><Coins className="h-4 w-4" />+{m.reward} por acierto</span></Button>)}</div>
      <Button size="lg" onClick={begin} disabled={busy}><Gamepad2 />{busy ? "Preparando…" : "Jugar"}</Button>
    </div> : quiz.question ? <div className="space-y-4">
      <div className="flex justify-between gap-2 text-sm font-extrabold"><span>Pregunta {quiz.position + 1} de {quiz.total}</span><span>{earned} monedas ganadas</span></div>
      <progress className="w-full h-2 accent-primary" value={quiz.position} max={quiz.total} />
      {quiz.question.imageKey && images[quiz.question.imageKey] && <img src={images[quiz.question.imageKey]} alt="Personaje u objeto del test" width={816} height={816} className="mx-auto h-52 w-52 rounded-lg object-contain" />}
      <h3 className="text-xl">{quiz.question.prompt}</h3>
      <div className="grid gap-2">{quiz.question.options.map((option, i) => <Button key={option} variant={feedback && option === feedback.correctAnswer ? "secondary" : "outline"} disabled={busy || !!feedback} onClick={() => choose(i)} className={`h-auto min-h-12 whitespace-normal text-left justify-start font-bold ${selected === i ? "ring-2 ring-primary" : ""}`}><span className="text-muted-foreground">{String.fromCharCode(65 + i)}.</span>{option}</Button>)}</div>
      {feedback && <div className="space-y-3 border-t-2 border-border pt-4" role="status">
        <p className="flex gap-2 font-extrabold">{feedback.wasCorrect ? <Check className="text-emerald" /> : <X className="text-accent" />}{feedback.wasCorrect ? `¡Correcto! +${feedback.earned ?? 0} monedas` : `La respuesta era: ${feedback.correctAnswer}`}</p>
        <p className="text-sm">{feedback.explanation}</p>
        <Button className="w-full" onClick={() => { setQuiz(feedback); setFeedback(null); setSelected(null); }}>{feedback.question ? "Siguiente pregunta" : "Ver resultado"}</Button>
      </div>}
    </div> : <div className="text-center space-y-4 py-8" role="status">
      <Trophy className="mx-auto h-20 w-20 text-ring-gold" /><h3 className="text-2xl">{quiz.correct === quiz.total ? "¡Partida perfecta!" : "¡Reto completado!"}</h3>
      <p className="text-xl font-extrabold">{quiz.correct} de {quiz.total} aciertos</p><p className="font-extrabold text-primary">+{earned} monedas</p>
      <div className="flex flex-wrap justify-center gap-2"><Button onClick={begin} disabled={busy}><Gamepad2 />Volver a jugar</Button><Button variant="outline" onClick={() => setQuiz(null)}>Cambiar reto</Button><Button variant="secondary" onClick={onShop}><Coins />Ir a la tienda</Button></div>
    </div>}
  </section>;
}