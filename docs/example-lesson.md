# What a session actually looks like

An abridged, real-shaped session on conditional probability. Open this file in
Obsidian to see it the way you would see a real lesson: coloured callouts,
typeset math, a drawn graph.

Tool calls are omitted from the log, so it reads as a class rather than as a
transcript.

---

## Phase 1 — Probe

> [!quote] YOU
> I want to get properly solid on conditional probability. I can apply Bayes but
> I don't think I really understand it.

> [!abstract] TUTOR
> "I can apply it but I don't understand it" usually means one of two very
> different things, and they need different lessons. Before I plan anything, let
> me find where the edge actually is.
>
> I'll ask a few questions and escalate until something breaks. Missing is the
> point — that's how I locate the border. Use **I don't know** when you don't
> know: a lucky guess plants a false data point and steers the whole lesson off
> your real edge.

> [!question] Quiz
> A fair coin is flipped twice. Let $A$ be "at least one head" and $B$ be "the
> first flip is heads". What is $P(A \mid B)$?
>
> 1. $1$
> 2. $3/4$
> 3. $1/2$
> 4. $2/3$
> 5. I don't know

> [!success] Quiz — correct ✓
> Correct answer: **1**
> If the first flip is heads, then "at least one head" is already guaranteed,
> whatever the second flip does. Conditioning restricted the world to the two
> outcomes $\{HH, HT\}$, and $A$ contains both.

> [!abstract] TUTOR
> That's the floor. Let me push up sharply.

> [!question] Quiz
> A test for a disease has sensitivity $0.99$ and specificity $0.99$. The
> disease affects $1$ in $10{,}000$ people. You test positive. Roughly what is
> $P(\text{disease} \mid +)$?
>
> 1. About $1\%$
> 2. About $99\%$
> 3. About $50\%$
> 4. It cannot be determined without knowing the sample size
> 5. I don't know
>
> *Note field:* I keep wanting to say 99% and I know that's the trap, but I
> can't say why.

> [!failure] Quiz — incorrect ✗
> Correct answer: **1**
> Out of $10{,}000$ people: about $1$ has the disease and tests positive; about
> $100$ are healthy and test positive anyway ($1\%$ of $9{,}999$). So roughly
> $1$ true positive among $101$ positives — about $1\%$.
>
> $99\%$ is $P(+ \mid \text{disease})$, the *other* conditional. Swapping the
> two is the single most common error with Bayes.

> [!abstract] TUTOR
> Your note is the useful part. You *knew* it was a trap and still could not
> name it — that is not a gap, it is a **systematic misconception**: you are
> treating $P(A \mid B)$ and $P(B \mid A)$ as roughly the same object, and
> patching it case by case with a memorised warning.
>
> That is worth evicting rather than topping up. Let me probe one more thing to
> confirm it is the direction and not the arithmetic.

> [!question] Quiz
> Which of these is *always* true?
>
> 1. $P(A \mid B)\,P(B) = P(B \mid A)\,P(A)$
> 2. $P(A \mid B) + P(B \mid A) = 1$
> 3. $P(A \mid B) = P(B \mid A)$ when $A$ and $B$ are independent
> 4. $P(A \mid B) \ge P(A)$
> 5. I don't know

> [!success] Quiz — correct ✓
> Correct answer: **1**
> Both sides equal $P(A \cap B)$. That is the whole of Bayes' rule, before it is
> rearranged into the form people memorise.

> [!abstract] TUTOR
> Edge located, bounded on both sides. You have the algebra; what you don't have
> is a picture of what conditioning *does*. That is exactly the thing to fix, and
> it makes the direction error impossible rather than merely warned against.

---

## Phase 2 — Plan

> [!tip] Plan
> **Approach.** We are not going to start from Bayes' rule and work backwards —
> that is where you already are, and it is not holding. We start from one
> unconditional truth about what a probability *is*, get conditioning as a
> **renormalisation**, and let Bayes fall out as a two-line consequence. By the
> time we reach it you should find the swap error not just wrong but
> *unstatable*.
>
> **The dependency map.** Roots are unconditional truths. Your goal is the
> destination. This is the teaching order.
>
> ```mermaid
> flowchart BT
>     R1["A probability is a number<br/>assigned to a SET of outcomes"]
>     R2["The sample space has<br/>total probability 1"]
>     R3["For disjoint sets,<br/>probabilities add"]
>
>     N1["Conditioning = restricting<br/>the sample space to B"]
>     N2["A restricted space must<br/>be renormalised to total 1"]
>     N3["P(A|B) = P(A∩B) / P(B)"]
>     N4["P(A∩B) is symmetric;<br/>P(A|B) is not"]
>     N5["Bayes: P(A|B)P(B) = P(B|A)P(A)"]
>     G(["GOAL: base rates and<br/>why direction matters"])
>
>     R1 --> N1
>     R2 --> N2
>     R3 --> N2
>     N1 --> N3
>     N2 --> N3
>     N3 --> N4
>     N4 --> N5
>     N5 --> G
>
>     style G fill:#7C3AED,color:#fff
> ```
>
> Note the shape: $P(A \cap B)$ being **symmetric** while $P(A \mid B)$ is
> **not** is a node of its own, not a footnote. Your error lives exactly there.
>
> **Does this look right to you?** If any root is not obviously true, say so now
> — it is cheap to fix here and expensive halfway through.

> [!quote] YOU
> Yes, go ahead. The three roots are all obvious.

---

## Phase 3 — Teach

> [!abstract] TUTOR
> **Why we need this node.** Every mistake you made above came from treating
> $P(A \mid B)$ as an operation on two *numbers*. It isn't. Fix what the objects
> are and the rest follows.
>
> Start at the floor, with something you can accept with no caveats:
>
> **A probability is a number assigned to a set of outcomes.** Not to a
> statement, not to a value — to a *set*. Formally:
> $$P : \mathcal{F} \to [0,1]$$
> where $\mathcal{F}$ is a collection of subsets of the sample space $\Omega$.
>
> This is unconditionally true, and it is doing real work already: it tells you
> $P(A)$ and $P(B)$ live on the *same* space, so $A \cap B$ is meaningful and
> $P(A \cap B)$ is one number — not two.

> [!question] Quiz
> Two dice are rolled. Which statement is true of the sample space?
>
> 1. It has $36$ elements, equally likely only if the dice are fair
> 2. It has $12$ elements, one per possible sum
> 3. It has $11$ elements, one per achievable sum
> 4. I don't know

> [!success] Quiz — correct ✓
> Correct answer: **1**
> The sample space lists *outcomes*, not *values of a function of the outcome*.
> The sum is a random variable defined on top of it.

> [!abstract] TUTOR
> **Now the discovery.** Suppose I tell you $B$ happened. What has actually
> changed?
>
> Not the outcomes' relative likelihoods — nothing physical happened. What
> changed is *which outcomes are still on the table*. Everything outside $B$ is
> now impossible.
>
> So try the obvious move: throw away everything outside $B$ and keep the rest as
> they were. But now your probabilities sum to $P(B)$, not to $1$ — and root R2
> says a sample space must total $1$. You have broken an axiom.
>
> **How would you repair it?**

> [!quote] YOU
> Divide everything by $P(B)$ so it adds back up to 1?

> [!abstract] TUTOR
> That is exactly it, and notice you *derived* it rather than being handed it:
> $$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$$
>
> **The edge to draw explicitly.** Look at what sits on top and what sits
> underneath. The numerator $P(A \cap B)$ is **symmetric** — $A \cap B$ and
> $B \cap A$ are the same set, so it is literally the same number. The
> denominator is **not**. So:
>
> $$\frac{P(A\cap B)}{P(B)} \quad\text{vs.}\quad \frac{P(A\cap B)}{P(A)}$$
>
> Same numerator, different denominator. $P(A \mid B)$ and $P(B \mid A)$ differ
> by exactly the ratio $P(A)/P(B)$ — nothing else.
>
> In the disease test: the shared numerator is "has the disease *and* tests
> positive". Dividing by $P(\text{disease})$ gives $0.99$. Dividing by
> $P(+)$ — which is about a hundred times larger, because almost everyone who
> tests positive is healthy — gives about $0.01$. Same numerator. The base rate
> *is* the denominator.
>
> You cannot swap them by accident once you can see there is only one numerator.

---

*The real lesson continues node by node to Bayes and the goal. Every node runs
the same loop: motivate → establish → connect → quiz-check.*
