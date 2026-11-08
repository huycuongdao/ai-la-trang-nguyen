# Speech acknowledgement latency (phase 10)

Measured on a real stage page (Chrome, audio allowed, Edge voice because VieNeu was off), server and browser on one machine.
Times are ms from the first `say` of a round.

| Line | Sent | Acknowledged | Total |
|---|---|---|---|
| Round title ("Vào khảo hạch trường làng nào.") | 0 | 6 545 | 6.5 s |
| Question 1 with 4 answers | 5 020 | 21 333 | 16.3 s |
| "Hết giờ rồi! Và đáp án chính xác..." | 30 123 | 34 321 | 4.2 s |
| "C, Hàn Quốc!" | 32 887 | 36 519 | 3.6 s |

- With the stage muted (or audio blocked by Chrome), the acknowledgement arrives in 5 to 8 ms.
- The 16.3 s for question 1 includes about 1.5 s waiting behind the round title and the time to generate and play the voice.
- Conclusion: a 15 s fallback would have started the answer timer before the voice finished. `SPOKEN_ACK_FALLBACK_MS` is 25 s (same as `GAME.docMaxSec`). Changing it is one constant in `src/server/spoken-queue.ts`.
