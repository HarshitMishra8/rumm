"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ProductArt } from "@/components/ProductArt";
import { formatINR } from "@/lib/pricing";
import type { ChatProduct } from "@/lib/assistant";

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  products?: ChatProduct[];
  error?: boolean;
}

const STORE_KEY = "rumm-chat";
const SUGGESTIONS = ["A sofa under ₹35,000", "Furnish a small bedroom for ₹40,000", "Where's my order?"];
const GREETING: Msg = {
  id: 0,
  role: "assistant",
  text: "Hi! I can help you find furniture, put a room together within a budget, add things to your bag, or check on an order. What are you looking for?",
};

let seq = 1;

const BULLET = /^\s*[-*•]\s+/;

/** **bold** (which may contain a link) and [label](/internal/link). External links stay plain text. */
function inline(text: string, key: string): React.ReactNode[] {
  return text.split(/(\*\*.+?\*\*|\[[^\]]+\]\(\/[^)\s]*\))/g).map((part, i) => {
    const k = `${key}-${i}`;
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={k}>{inline(bold[1], k)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((\/[^)\s]*)\)$/);
    if (link) {
      return (
        <Link key={k} href={link[2]} className="text-link">
          {link[1]}
        </Link>
      );
    }
    return <Fragment key={k}>{part}</Fragment>;
  });
}

/** Paragraphs, line breaks and "- " lists, even when a list follows a sentence directly. */
function Rich({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  text.split(/\n{2,}/).forEach((block, b) => {
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
      if (para.length) {
        const lines = para;
        out.push(
          <p key={`p${b}-${out.length}`}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l, `${b}-${out.length}-${i}`)}
              </Fragment>
            ))}
          </p>,
        );
      }
      para = [];
    };
    const flushList = () => {
      if (list.length) {
        const items = list;
        out.push(
          <ul key={`u${b}-${out.length}`}>
            {items.map((l, i) => (
              <li key={i}>{inline(l, `${b}-l${out.length}-${i}`)}</li>
            ))}
          </ul>,
        );
      }
      list = [];
    };
    for (const line of block.split("\n")) {
      if (BULLET.test(line)) {
        flushPara();
        list.push(line.replace(BULLET, ""));
      } else if (line.trim()) {
        flushList();
        para.push(line);
      }
    }
    flushPara();
    flushList();
  });
  return <>{out}</>;
}

export function ChatWidget() {
  const { add, refresh, notify } = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // keep the conversation across page reloads in this tab
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "null") as Msg[] | null;
      if (saved?.length) {
        setMessages(saved);
        seq = Math.max(...saved.map((m) => m.id)) + 1;
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...messages, { id: seq++, role: "user" as const, text: t }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => !m.error && m.id !== 0).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The assistant couldn't answer. Try again.");
      setMessages((m) => [...m, { id: seq++, role: "assistant", text: data.reply, products: data.products }]);
      if (data.cartChanged) {
        await refresh();
        notify("Added to your bag");
      }
    } catch (err) {
      setMessages((m) => [...m, { id: seq++, role: "assistant", text: (err as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([GREETING]);
    try {
      sessionStorage.removeItem(STORE_KEY);
    } catch {}
  }

  return (
    <>
      <button
        type="button"
        className="chat-launcher"
        data-open={open || undefined}
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path
              d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 014 13.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <span>{open ? "Close" : "Ask Rumm"}</span>
      </button>

      {open && (
        <section id="chat-panel" className="chat-panel" role="dialog" aria-label="Rumm shopping assistant">
          <header className="chat-head">
            <div>
              <p className="chat-title">Ask Rumm</p>
              <p className="chat-sub">Answers come from our catalogue, your bag and your orders</p>
            </div>
            {messages.length > 1 && (
              <button type="button" className="chat-reset" onClick={reset}>
                New chat
              </button>
            )}
          </header>

          <div className="chat-log" ref={listRef} aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg chat-${m.role}`} data-error={m.error || undefined}>
                <div className="chat-bubble">
                  <Rich text={m.text} />
                </div>
                {m.products && m.products.length > 0 && (
                  <ul className="chat-products">
                    {m.products.map((p) => (
                      <li key={p.id}>
                        <Link href={`/product/${p.slug}?c=${p.colorwayId}`} className="chat-product">
                          <span className="chat-thumb" aria-hidden="true">
                            <ProductArt kind={p.art} color={p.hex} wood={p.wood} />
                          </span>
                          <span className="chat-product-text">
                            <strong>{p.name}</strong>
                            <small>{p.type}</small>
                            <b>{formatINR(p.price)}</b>
                          </span>
                        </Link>
                        <button
                          type="button"
                          className="quick-add"
                          disabled={!p.inStock}
                          aria-label={p.inStock ? `Add ${p.name} to bag` : `${p.name} is out of stock`}
                          onClick={(e) => add({ productId: p.id, colorwayId: p.colorwayId }, e.currentTarget.parentElement?.querySelector("svg"))}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && (
              <div className="chat-msg chat-assistant">
                <div className="chat-bubble chat-typing" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            {messages.length === 1 && !busy && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="chat-text" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-text"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={1000}
              placeholder="Ask about furniture, your bag or an order"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <button type="submit" className="chat-send" disabled={busy || !input.trim()} aria-label="Send">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </section>
      )}
    </>
  );
}
