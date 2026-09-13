# Your half of the system

The pedagogy is documented in [the guide](guide.md#4-how-it-teaches) and
enforced by [`AGENTS.md`](../AGENTS.md). This page is about the other half: what
**you** have to do for any of it to work, and the ways learners reliably break
it without noticing.

Read it once before your first session. It is short on purpose.

---

## The contract

The system is built on one assumption: **that what you tell it about yourself is
true.** Everything downstream — where it starts, what it skips, what it decides
to evict — is computed from your answers in Phase 1. Feed it a flattering
picture of yourself and it will teach, competently and confidently, to a person
who does not exist.

That is the whole contract. The rest of this page is consequences of it.

---

## Four ways learners break it

### 1. Guessing instead of saying "I don't know"

The most common and the most damaging. A quiz has a dedicated **I don't know**
option that is deliberately *not* scored as a wrong answer — it produces a
separate signal.

A lucky guess is indistinguishable from knowledge. The tutor records a node as
solid, builds three more on top of it, and the whole branch is standing on
nothing. You will feel the collapse two hours later and blame the explanation.

**Rule:** if you would not bet on it, you don't know it.

### 2. Reading the Phase 2 plan as an announcement

It is not an announcement. It is a **checkpoint**, and it is the cheapest point
in the entire session to change direction.

Read the dependency map. Ask of every root: *do I accept this at face value,
with no caveats?* If the answer is "sort of" or "I'd have to think about it",
that is a root in the wrong place — say so. Fixing it now costs one message.
Fixing it in Phase 3 means unwinding every node built on top.

Also check the **scope**. If the destination node is not the thing you actually
wanted, this is when to say it.

### 3. Wanting Phase 1 to be over

It can run long. It is supposed to. It is the only part of the session that is
pure measurement, and every minute spent there makes every later minute point in
the right direction.

The impatience usually shows up as answering quickly and carelessly, which
corrupts the measurement, which produces a lesson pitched at the wrong level,
which is far slower than the probe you were trying to skip.

**Expect to miss questions.** Getting everything right is not a pass — it means
the questions were too easy, and it will escalate until something breaks. That
break is the *finding*, not a failure.

### 4. Not writing anything down yourself

Reading a good explanation produces a strong feeling of understanding that is
only weakly correlated with understanding. The cheap test: **close the note and
write the idea in your own words.**

Do it in `Lessons/<Topic> - my notes.md`, wikilinked with `[[<Topic>]]`. Not in
the lesson log itself — that file gets rewritten and your words will vanish.

If you can't do it, you have found a node that didn't land. Go back and say so.
That is the single highest-value message you can send in a session.

---

## How to read a quiz

Knowing the construction rules stops you guessing from the *shape* rather than
the *content* — which is a way of cheating yourself, since the map it builds is
the map it teaches from.

Every quiz is built like this:

1. **Every option is a bare assertion, with no justification attached.** If one
   option carried its own reasoning ("…, because it preserves X") it would be a
   giveaway. All the "why" is in the explanation, revealed only after you answer.
2. **The correct option is written first, then mutated into each distractor** —
   same skeleton, same level of detail, same register.
3. **Every distractor is a real mistake you could make.** This is why *which*
   wrong option you pick is diagnostic, and why "I was between 2 and 4" is worth
   writing in the note field.
4. **No asymmetric bolding**, and the options are **shuffled** — there is no
   positional pattern.

If you can tell which option is correct by reading the set cold, without knowing
the subject, the quiz is badly built. Say so; it should be regenerated.

**Use the note field.** Explaining why you were torn between two options converts
a wrong answer from a data point into a diagnosis, and it is the fastest way to
get a systematic misconception spotted and evicted rather than merely patched.

---

## When to push back

You are allowed to, and the system is designed expecting it.

| Say this | When |
|---|---|
| *"That root isn't obvious to me."* | A Phase 2 root you can't accept at face value. **Always** worth saying. |
| *"Go expository."* | You're low on energy, or the Socratic back-and-forth on this node is grinding. |
| *"Go Socratic."* | It's narrating and you'd rather try the discovery yourself. |
| *"I don't think that's right."* | Anything that smells wrong. The accuracy rule obliges it to verify rather than defend. |
| *"That diagram isn't telling me anything."* | A decorative diagram is noise plus a chance to be wrong. |
| *"I can't restate node 4."* | The most valuable sentence in this table. |
| *"This isn't what I wanted to learn."* | Any time. Cheapest in Phase 2. |

---

## Further reading

The ideas here are not invented by this project. If you want the sources:

- **[How I Use AI to Learn Things](https://www.youtube.com/watch?v=kzcI5F4tGiU)**
  — the video the teaching system comes from.
- **[3Blue1Brown](https://www.3blue1brown.com/)** — the declared reference for
  "how could I have discovered this myself?". Watch how nothing ever appears
  without a reason for it to appear.
- **Vygotsky's zone of proximal development** — why Phase 1 exists at all.
- **The testing effect** (Roediger & Karpicke) — why the quiz-check is part of
  teaching a node, not an exam after it.
