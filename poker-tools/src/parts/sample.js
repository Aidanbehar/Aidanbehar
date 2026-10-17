
/* Built-in sample game for the viewer ("Load sample game") and the self-tests. */
const SAMPLE_RECORD = `[Event "Friday Night Game"]
[Date "2026.10.09"]
[Variant "NLHE"]
[Blinds "1/2"]
[Ante "0"]
[StartingStack "200"]
[Players "Alice,Bob,Carol,Dave"]
[HoleCards "All"]

#1 [Button "Alice"] [Stacks "Alice:200, Bob:200, Carol:200, Dave:200"]
Bob sb 1; Carol bb 2
Dave [Ah4d] f; Alice [9sTd] f; Bob [5d3h] c 2; Carol [ThJd] x
F: Kd 8s 9h; Bob x; Carol b 31; Bob r 71; Carol c 71
T: 2d; Bob x; Carol x
R: 5h; Bob x; Carol b 20; Bob c 20
SD: Carol shows [ThJd]; Bob shows [5d3h]
=> Bob wins 186 (Pair of Fives)

#2 [Button "Bob"] [Stacks "Alice:200, Bob:293, Carol:107, Dave:200"]
Carol sb 1; Dave bb 2
Alice [Tc4s] c 2; Bob [Qh6c] f; Carol [AcQc] f; Dave [Ks5h] r 35; Alice f
=> Dave wins 5

#3 [Button "Carol"] [Stacks "Alice:198, Bob:293, Carol:106, Dave:203"]
Dave sb 1; Alice bb 2
Bob [6h3h] r 293; Carol [3d2s] f; Dave [5cTh] f; Alice [6d5s] c 198
F: 8h Ac Tc
T: Qs
R: 2c
SD: Alice shows [6d5s]; Bob shows [6h3h]
=> Alice wins 199 (High Card, Ace); Bob wins 198 (High Card, Ace)

#4 [Button "Dave"] [Stacks "Alice:199, Bob:293, Carol:106, Dave:202"]
Alice sb 1; Bob bb 2
Carol [9cKd] c 2; Dave [As3d] f; Alice [TsJs] c 2; Bob [9d7d] r 7; Carol f; Alice c 7
F: 2d Ad Kc; Alice x; Bob x
T: 2s; Alice b 40; Bob c 40
R: 7s; Alice x; Bob x
SD: Alice shows [TsJs]; Bob shows [9d7d]
=> Bob wins 96 (Two Pair, Sevens and Twos)

#5 [Button "Alice"] [Stacks "Alice:152, Bob:342, Carol:104, Dave:202"]
Bob sb 1; Carol bb 2
Dave [8c9s] f; Alice [Kh9c] f; Bob [Kc4s] c 2; Carol [Th2h] x
F: Qc 6s 3d; Bob x; Carol x
T: 9h; Bob x; Carol x
R: Ad; Bob x; Carol x
SD: Bob shows [Kc4s]; Carol mucks
=> Bob wins 4 (High Card, Ace)

#6 [Button "Bob"] [Stacks "Alice:152, Bob:344, Carol:102, Dave:202"]
Carol sb 1; Dave bb 2
Alice [5sJh] c 2; Bob [7dQh] r 6; Carol [6h3s] f; Dave [Qs3d] f; Alice f
=> Bob wins 7

#7 [Button "Carol"] [Stacks "Alice:150, Bob:349, Carol:101, Dave:200"]
Dave sb 1; Alice bb 2
Bob [8hKs] c 2; Carol [QsAc] f; Dave [6h9s] f; Alice [2cQc] x
F: 6c 8c Td; Alice x; Bob b 347; Alice c 148
T: Qd
R: 4h
SD: Alice shows [2cQc]; Bob shows [8hKs]
=> Alice wins 301 (Pair of Queens)

#8 [Button "Dave"] [Stacks "Alice:301, Bob:199, Carol:101, Dave:199"]
Alice sb 1; Bob bb 2
Carol [7c3h] c 2; Dave [7hKc] f; Alice [6h4h] c 2; Bob [9cAd] x
F: Qs 8h 7s; Alice b 15; Bob r 66; Carol f; Alice r 148; Bob f
=> Alice wins 138

#9 [Button "Alice"] [Stacks "Alice:371, Bob:131, Carol:99, Dave:199"]
Bob sb 1; Carol bb 2
Dave [6d5d] f; Alice [Jc5s] f; Bob [KhTd] c 2; Carol [2d6c] x
F: 2c 8s Jh; Bob x; Carol x
T: 4c; Bob x; Carol x
R: 9s; Bob b 3; Carol c 3
SD: Bob shows [KhTd]; Carol shows [2d6c]
=> Carol wins 10 (Pair of Twos)

#10 [Button "Bob"] [Stacks "Alice:371, Bob:126, Carol:104, Dave:199"]
Carol sb 1; Dave bb 2
Alice [3sJc] c 2; Bob [3d9d] r 16; Carol [6cAh] c 16; Dave [9sJs] c 16; Alice f
F: 3h Qs 4c; Carol x; Dave b 19; Bob c 19; Carol c 19
T: Th; Carol x; Dave x; Bob b 13; Carol f; Dave c 13
R: 7h; Dave x; Bob b 78; Dave c 78
SD: Bob shows [3d9d]; Dave shows [9sJs]
=> Bob wins 289 (Pair of Threes)

#11 [Button "Carol"] [Stacks "Alice:369, Bob:289, Carol:69, Dave:73"]
Dave sb 1; Alice bb 2
Bob [KcAs] r 44; Carol [3c6d] r 69; Dave [5d3s] f; Alice [Qh2c] c 69; Bob c 69
F: Js Ks Qd; Alice b 27; Bob c 27
T: Td; Alice x; Bob b 193; Alice c 193
R: Jc
SD: Alice shows [Qh2c]; Bob shows [KcAs]; Carol shows [3c6d]
=> Bob wins 208 from main pot (Straight, Ace high); Bob wins 440 from side pot 1 (Straight, Ace high)

#12 [Button "Dave"] [Stacks "Alice:80, Bob:648, Dave:72"]
Alice sb 1; Bob bb 2
Dave [4hJs] c 2; Alice [Qh2h] r 14; Bob [QdTs] f; Dave c 14
F: Ac Qc 4c; Alice x; Dave b 24; Alice c 24
T: 6s; Alice x; Dave x
R: Kh; Alice x; Dave x
SD: Alice shows [Qh2h]; Dave mucks
=> Alice wins 78 (Pair of Queens)

#13 [Button "Alice"] [Stacks "Alice:120, Bob:646, Dave:34"]
Bob sb 1; Dave bb 2
Alice [5h4d] c 2; Bob [Ac2d] f; Dave [Qc3d] x
F: 9d 9c Jh; Dave b 31; Alice c 31
T: Td; Dave x; Alice x
R: 5s; Dave b 1; Alice f
=> Dave wins 67

#14 [Button "Bob"] [Stacks "Alice:87, Bob:645, Dave:68"]
Dave sb 1; Alice bb 2
Bob [9s6s] c 2; Dave [2c2d] c 2; Alice [6c4h] x
F: 7d 5d Js; Dave x; Alice x; Bob x
T: 8d; Dave x; Alice b 6; Bob c 6; Dave r 31; Alice c 31; Bob c 31
R: 7s; Dave x; Alice x; Bob x
SD: Dave shows [2c2d]; Alice shows [6c4h]; Bob shows [9s6s]
=> Bob wins 99 (Straight, Nine high)

`;
