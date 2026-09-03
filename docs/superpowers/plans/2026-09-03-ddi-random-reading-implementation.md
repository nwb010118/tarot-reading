# 리딩 랜덤화 — 띠운세 파일럿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 띠운세(`data/ddi-data.js`)의 카테고리 본문·`trait`을 "관찰절(A)+조언절(B)" 슬롯 배열(`{a:[...], b:[...]}`, 각 3개)로 바꾸고 `keywords`(3→6)/`advice`(1→3)를 풀로 확장해, 같은 선택을 반복해도 리딩이 매번 랜덤하게 달라지도록 만든다. `js/app.js`의 공유 헬퍼(`resolveCategoryMeaning`/`renderKeywordsAdviceHtml`)를 문자열/풀 객체 모두 지원하도록 확장해 다른 4개 모드(타로/사주/별자리/궁합)는 무변경으로 유지한다.

**Architecture:** 데이터는 필드값이 문자열이면 그대로, `{a,b}` 객체면 각 배열에서 무작위로 하나씩 뽑아 조합하는 방식으로 하위 호환을 유지한다(`resolveMeaningText()`). `keywords`/`advice`도 배열이면 무작위 샘플링/선택하고 아니면 그대로 통과한다(`pickKeywords()`/`pickAdvice()`). 이 4개 헬퍼는 `js/app.js`에 신설하고, 기존 `resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()` 내부에서 호출하도록 수정한다 — 호출부(`showZodiacSummary`/`showDdiSummary`/`showSajuSummary`/`showCompatibilitySummary`/타로 `showSummary`) 코드는 손대지 않는다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음). Node `assert` 기반 테스트, `tests/helpers/dedup.js`의 기존 공유 함수 재사용(신규 export 불필요).

## Global Constraints

- 대상은 `data/ddi-data.js`(12개 띠) 하나뿐이다. 다른 4개 모드(`data/tarot-data*.js`, `data/saju-data.js`, `data/zodiac-data.js`, `data/compatibility-data.js`)는 이 플랜에서 전혀 수정하지 않는다.
- 각 필드(카테고리 본문 19개 + `trait` 1개, 띠당 20개)의 **기존 값이 새 배열의 인덱스 0(`a[0]`/`b[0]`)이 되어야 하며, 절대 수정하지 않는다** — 기존 필드는 이미 "관찰절(1문장)+조언절(1문장)" 두 문장으로 쓰여 있으므로 그 경계 그대로 `a[0]`/`b[0]`으로 나눈다.
- 신규 변형은 슬롯당 2개씩 추가해 풀 크기를 3으로 만든다(`a`/`b` 각 정확히 3개).
- `keywords`는 3개(기존, 순서 유지) + 3개(신규, 뒤에 추가) = 정확히 6개 배열. `advice`는 기존 문자열이 인덱스 0이 되고 신규 2개를 추가해 정확히 3개 배열.
- 재추첨(연속 동일 조합 방지) 로직은 만들지 않는다 — 순수 랜덤(사용자 확인 완료, [2026-09-03-ddi-random-reading-design.md](../specs/2026-09-03-ddi-random-reading-design.md) 참고).
- **잠긴 참조**: `key: "monkey"`(원숭이띠) — 아래 Task 1 Step 1에 실제 dedup 알고리즘으로 검증(0건 충돌 확인됨)까지 마친 최종 콘텐츠가 그대로 제공되어 있다. **이 블록은 절대 수정하지 않는다.**
- 세분화 카테고리·서브키, 금지쌍(forbidden pairs)은 기존과 완전히 동일: `love`(solo/couple)↔`relationships`(new/existing), `career`(jobseek/switch)↔`workplace`(team/personal), `money`(consumption/invest)↔`business`(startup/running). 단일 카테고리는 `honor`/`moving`/`children`.
- **중복검사는 두 축으로 나눈다(이유는 아래 참고)**:
  1. **필드 내부(within-field) 자기중복**: 같은 필드의 `a`풀 3개끼리, `b`풀 3개끼리 각각 3단 결합(word-Jaccard≥0.3 전체 스윕 + word≥0.20∧trigram≥0.15 결합 + LCS≥5∨어근중복≥2∨bigram≥0.185 결합, 상투구·자기 keywords 제거 후) 검사를 **`a`/`b` 둘 다에** 적용한다. 인덱스 0만 기존 문장이고 1·2는 새로 쓰는 문장이라 충돌이 나와도 항상 새 문장 쪽을 고치면 되므로 엄격하게 적용해도 안전하다.
  2. **금지쌍(cross-category) 검사**: 같은 띠 안에서 `a`풀은 기존과 동일하게 3단 결합 전체를 적용하고(기존 프로젝트의 "오프닝 문장" 검사 범위 그대로, 이제 3개 변형 전체가 오프닝 후보이므로 3×3 전수 비교), **`b`풀은 word-Jaccard≥0.3 단순 스윕만 적용한다**(3단 결합은 적용하지 않음). 이유: `b[0]`은 두 필드 모두 기존 5개 서브프로젝트에서 이미 커밋된 잠긴 문장이라 수정이 불가능한데, 실제로 `love.couple.b[0]`↔`relationships.new.b[0]`처럼 이미 배포된 두 문장 사이에 새 3단 결합 기준으로는 걸리지만(어근중복 2개 이상) 원래 프로젝트의 단순 word-Jaccard 기준(0.3 미만)으로는 통과하는 사례가 실제로 발견되었다(Task 1에서 검증). 3단 결합을 `b`풀 금지쌍에도 적용하면 고칠 수 없는 기존 문장끼리 계속 실패하게 되므로, `b`풀 금지쌍은 원래 프로젝트가 쓰던 검사 강도(단순 word-Jaccard)를 그대로 유지한다.
  - `advice` 풀(3개, 짧은 단문)도 같은 축 1의 정신으로 자기중복을 검사하되 강도는 `b`풀 금지쌍과 같은 단순 word-Jaccard≥0.3 스윕만 적용한다(3단 결합까지는 과함 — 단문이라 상투구 제거 전제가 잘 안 맞음).
  - 위 축들은 아래 Task 1 Step 3의 스윕 스크립트, Task 3의 영구 테스트에 동일하게 구현한다.
  - `stripOwnKeywords`/`stripBoilerplateSuffix`용 상투구 목록에 A절 종결형(`시기입니다`/`것입니다`/`합니다`)뿐 아니라 **B절(조언절) 종결형도 추가**해야 한다: `해보세요`/`주세요`/`두세요`/`하세요`/`보세요`/`세요`. 기존 프로젝트는 오프닝(A절)만 이 상투구 제거를 적용했지만 이번엔 B풀 자기중복 검사에도 이 제거가 필요하기 때문이다.
- 신규 헬퍼 함수 시그니처는 다음으로 고정한다(이후 태스크가 이 이름·파라미터를 그대로 사용): `pickRandom(arr)`, `resolveMeaningText(value)`, `pickKeywords(keywordsPool, count)`(count 기본값 3), `pickAdvice(advicePool)`.
- `resolveCategoryMeaning`/`renderKeywordsAdviceHtml`의 기존 시그니처(파라미터 이름·순서)는 변경하지 않는다 — 내부 구현만 확장한다.
- 새 HTML 마크업이나 CSS는 만들지 않는다.
- `data/ddi-data.js`는 기존에 큰따옴표(`"..."`) 스타일을 쓴다 — 그대로 따른다.

---

## Task 1: `data/ddi-data.js` 콘텐츠 변환 — Part A (원숭이띠[잠긴 참조] + 5개 띠)

**Files:**
- Modify: `data/ddi-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `DDI_DATA[0..5]`(monkey, rooster, dog, pig, rat, ox)의 `trait`/`categories.*`가 `{a:[...3], b:[...3]}` 구조로, `keywords`가 6개 배열로, `advice`가 3개 배열로 변경됨. Task 2가 나머지 6개 띠에 동일 구조를 적용하고, Task 3(테스트)·Task 4(app.js)가 이 새 구조를 전제로 동작한다.

- [ ] **Step 1: "원숭이띠" 항목을 아래 잠긴 참조 콘텐츠로 정확히 교체**

`data/ddi-data.js`의 첫 번째 `DDI_DATA` 항목(`key: "monkey"`, 현재 3~45행)을 다음으로 통째로 교체한다. **이 콘텐츠는 이미 실제 dedup 스윕 스크립트로 검증되어 충돌 0건임이 확인되었다 — 한 글자도 수정하지 않는다.**

```js
  {
    key: "monkey", name_kr: "원숭이띠",
    trait: {
      a: [
        "영리하고 재치 있는 원숭이띠는 순발력 있게 상황에 대처합니다.",
        "새로운 정보는 남들보다 먼저 캐치해 자기 것으로 만드는 재주가 있습니다.",
        "어떤 자리에서든 특유의 유쾌함으로 분위기를 단숨에 바꿔놓습니다."
      ],
      b: [
        "다재다능함이 큰 무기입니다.",
        "그 재주를 한 곳에 오래 쏟아붓는 끈기를 더하면 결실이 배가됩니다.",
        "가벼운 매력 뒤에 숨은 영리함이 진짜 승부처에서 빛을 발합니다."
      ]
    },
    keywords: ["재치", "순발력", "다재다능", "호기심", "위트", "융통성"],
    advice: [
      "임기응변만큼 꾸준한 마무리를 챙기면 성과가 더 오래갑니다.",
      "번뜩이는 재치에 진득한 뒷심을 더하면 결과가 확실히 달라집니다.",
      "가벼운 매력 아래 숨은 실력을 보여줄 때 진짜 인정을 받습니다."
    ],
    categories: {
      love: {
        solo: {
          a: [
            "가벼운 농담 한마디로 상대의 마음을 순식간에 사로잡는 시기입니다.",
            "재치 있는 리액션 하나로 상대의 웃음 버튼을 정확히 누르는 시기입니다.",
            "관심 있는 사람 앞에서 유독 말이 많아지고 장난기가 늘어나는 시기입니다."
          ],
          b: [
            "고백을 서두르기보다는 편안한 분위기를 먼저 만들어보세요.",
            "장난기 뒤에 숨겨둔 설렘을 가끔은 솔직하게 드러내 보세요.",
            "웃기는 사람으로만 기억되지 않도록 진지한 순간도 한 번씩 보여주세요."
          ]
        },
        couple: {
          a: [
            "위트 넘치는 대화로 연인과의 시간을 즐겁게 채우는 시기입니다.",
            "즉흥적인 이벤트 하나로 연인에게 깜짝 즐거움을 안겨주는 시기입니다.",
            "가벼운 농담을 주고받으며 연인과의 데이트가 유독 유쾌해지는 시기입니다."
          ],
          b: [
            "재미만 좇다 진지한 대화를 놓치지 않도록 균형을 잡아보세요.",
            "장난이 지나쳐 서운함으로 번지지 않도록 상대의 표정도 살펴보세요.",
            "즐거움 뒤에 챙겨야 할 약속과 기념일도 잊지 말고 꼭 기억해두세요."
          ]
        }
      },
      money: {
        consumption: {
          a: [
            "재미있어 보이는 것에 홀려 지갑을 쉽게 여는 시기입니다.",
            "새로 나온 신기한 물건에 홀려 계획에 없던 지출이 늘어나는 시기입니다.",
            "친구들과 어울리며 즉흥적으로 결제 버튼을 누르는 일이 잦아지는 시기입니다."
          ],
          b: [
            "충동적인 선택 전에 잠깐 멈춰 생각하는 습관이 도움이 됩니다.",
            "결제하기 전 24시간만 참아보면 진짜 필요한지 가려낼 수 있습니다.",
            "재미로 산 물건이 서랍 속에 쌓이지 않도록 씀씀이를 점검해보세요."
          ]
        },
        invest: {
          a: [
            "발 빠른 정보력으로 남들보다 먼저 기회를 알아채는 시기입니다.",
            "이곳저곳에서 주워들은 정보를 짜맞춰 나만의 투자 그림을 그려보는 시기입니다.",
            "유행보다 한 박자 빠르게 흐름을 읽어내고 싶은 마음이 커지는 시기입니다."
          ],
          b: [
            "다만 확인 없이 뛰어들면 손해로 이어질 수 있으니 조심하세요.",
            "속도만 앞세우다 검증을 건너뛰지 않도록 최소한의 확인은 거치세요.",
            "재빠른 감각도 좋지만 자금 일부는 안전한 곳에 남겨두는 게 좋습니다."
          ]
        }
      },
      career: {
        jobseek: {
          a: [
            "임기응변에 강한 면모가 면접에서 좋은 인상을 남기는 시기입니다.",
            "예상 밖의 질문에도 재치 있게 답하며 면접관의 시선을 사로잡는 시기입니다.",
            "지원 가능한 곳이라면 일단 문을 두드리며 가능성을 넓혀가는 시기입니다."
          ],
          b: [
            "순발력만 믿지 말고 기본기도 꼼꼼히 준비해두세요.",
            "순간의 재치가 통하지 않을 때를 대비해 모범답안도 준비해두세요.",
            "넓게 지원하는 만큼 정말 원하는 곳에는 더 공을 들여보세요."
          ]
        },
        switch: {
          a: [
            "지금 자리에 남을지 새 도전에 나설지 고민이 깊어지는 시기입니다.",
            "새로운 자리의 소식을 여기저기서 발 빠르게 접하게 되는 시기입니다.",
            "익숙한 업무가 슬슬 지루해지며 변화를 향한 마음이 커지는 시기입니다."
          ],
          b: [
            "재빠른 결정보다 충분한 정보 수집이 먼저입니다.",
            "여러 선택지를 동시에 저울질하다 결정을 계속 미루지 않도록 하세요.",
            "재미있어 보인다는 이유만으로 성급하게 옮기지 않도록 조건을 따져보세요."
          ]
        }
      },
      workplace: {
        team: {
          a: [
            "위트 있는 발언으로 회의 분위기를 밝게 만드는 시기입니다.",
            "재빠른 순발력으로 회의 중 막힌 대화의 물꼬를 트는 시기입니다.",
            "쉴 새 없이 떠오르는 아이디어로 팀 전체에 생기를 불어넣는 시기입니다."
          ],
          b: [
            "아이디어를 실행으로 옮기는 끈기도 함께 보여주면 신뢰가 쌓입니다.",
            "쏟아낸 아이디어 중 하나를 골라 끝까지 책임지는 모습도 보여주세요.",
            "가벼운 농담이 회의의 흐름을 끊지 않도록 타이밍을 살펴보세요."
          ]
        },
        personal: {
          a: [
            "여러 업무를 동시에 처리하는 순발력이 돋보이는 시기입니다.",
            "밀려드는 요청을 순서 없이도 척척 해치우는 재주를 발휘하는 시기입니다.",
            "갑자기 끼어든 요청에도 당황하지 않고 순발력 있게 대응하는 시기입니다."
          ],
          b: [
            "속도에 취해 마무리를 소홀히 하지 않도록 점검하세요.",
            "빠른 처리 속도만큼 결과물의 완성도도 한 번 더 확인해보세요.",
            "여러 일을 동시에 벌이다 우선순위를 놓치지 않도록 정리해두세요."
          ]
        }
      },
      business: {
        startup: {
          a: [
            "아무도 눈여겨보지 않던 틈새를 재빠르게 캐치해 사업 아이디어로 연결하는 시기입니다.",
            "톡톡 튀는 발상 하나로 사업의 밑그림을 순식간에 그려내는 시기입니다.",
            "여러 시장을 넘나들며 새로운 조합의 사업 기회를 포착하는 시기입니다."
          ],
          b: [
            "아이디어만큼 꾸준한 실행력을 갖추는 게 관건입니다.",
            "번뜩이는 발상을 구체적인 계획표로 옮기는 작업을 소홀히 하지 마세요.",
            "재미있는 아이디어일수록 수익 구조부터 냉정하게 점검해보세요."
          ]
        },
        running: {
          a: [
            "예리한 눈치로 위기의 순간마다 판을 뒤집는 시기입니다.",
            "돌발 변수가 생겨도 재빠른 대처로 매출 곡선을 지켜내는 시기입니다.",
            "경쟁사의 움직임을 눈치 빠르게 읽어내 대응 전략을 바꾸는 시기입니다."
          ],
          b: [
            "임기응변에만 의존하지 말고 장기 전략도 함께 세워보세요.",
            "순발력에만 기대다 기본적인 재무 관리를 놓치지 않도록 하세요.",
            "빠른 대응도 좋지만 직원들과 방향을 맞추는 시간도 함께 가지세요."
          ]
        }
      },
      study: {
        exam: {
          a: [
            "핵심만 콕 집어 효율적으로 공부하는 요령이 빛을 발하는 시기입니다.",
            "짧은 시간에도 문제 유형을 재빠르게 파악해 점수를 끌어올리는 시기입니다.",
            "여러 과목을 오가며 지루하지 않게 공부 리듬을 만들어가는 시기입니다."
          ],
          b: [
            "요령에만 기대지 말고 기초를 다지는 시간도 확보하세요.",
            "요령 좋은 풀이가 통하지 않는 서술형 문제도 미리 대비해두세요.",
            "이 과목 저 과목 옮겨다니다 한 과목이라도 깊이 놓치지 않게 하세요."
          ]
        },
        path: {
          a: [
            "여러 분야에 대한 호기심이 새로운 진로 아이디어로 이어지는 시기입니다.",
            "관심사가 하루가 다르게 바뀌며 마음이 자꾸 다른 방향으로 흔들리는 시기입니다.",
            "능청스러운 매력을 살릴 만한 일이 있는지 자꾸 눈이 가는 시기입니다."
          ],
          b: [
            "흥미를 좇다 한 우물을 파는 끈기도 잊지 마세요.",
            "여러 갈래로 흩어진 관심을 하나로 좁혀보는 시간도 필요합니다.",
            "번뜩이는 아이디어를 실제 진로로 연결할 구체적인 계획도 세워보세요."
          ]
        }
      },
      health: {
        body: {
          a: [
            "재빠른 몸놀림으로 활동적인 하루를 보내는 시기입니다.",
            "가만히 있지 못하고 몸을 계속 움직이게 되는 시기입니다.",
            "여러 운동을 번갈아 시도하며 몸에 활력을 더하는 시기입니다."
          ],
          b: [
            "이것저것 손대다 정작 휴식을 놓치지 않도록 하세요.",
            "쉴 새 없이 움직이다 작은 부상을 입지 않게 조심하세요.",
            "새로운 운동을 시도하는 것도 좋지만 몸에 무리가 없는지 점검하세요."
          ]
        },
        mind: {
          a: [
            "머릿속이 여러 생각으로 분주해 산만해지기 쉬운 시기입니다.",
            "이런저런 생각이 꼬리를 물며 집중이 자꾸 흐트러지는 시기입니다.",
            "재미있는 일에 정신이 팔려 정작 중요한 일을 깜빡하는 시기입니다."
          ],
          b: [
            "하나씩 정리하는 시간을 가지면 마음이 한결 가벼워집니다.",
            "메모하는 습관을 들이면 흩어진 생각을 붙잡는 데 도움이 됩니다.",
            "잠깐이라도 한 가지에만 온전히 몰두하는 순간을 따로 마련해보세요."
          ]
        }
      },
      relationships: {
        new: {
          a: [
            "재치 있는 첫인상으로 새로운 사람들의 호감을 얻는 시기입니다.",
            "유쾌한 화술로 처음 만난 자리에서도 금세 분위기를 주도하는 시기입니다.",
            "새로운 모임에 스스럼없이 어울리며 인맥의 폭을 넓혀가는 시기입니다."
          ],
          b: [
            "인맥을 넓히는 재미에 깊이를 놓치지 않도록 신경 쓰세요.",
            "재미있는 사람이라는 인상에서 그치지 말고 진솔한 이야기도 함께 나눠보세요.",
            "넓게 사귀는 만큼 마음이 통하는 인연에는 더 정성을 들여보세요."
          ]
        },
        existing: {
          a: [
            "가벼운 장난기로 오래된 친구들과의 만남에 활기를 더하는 시기입니다.",
            "오랜 인연들 사이에서 특유의 유쾌함으로 분위기 메이커 역할을 하는 시기입니다.",
            "가끔은 즉흥적인 약속을 제안하며 묵은 인연에 활력을 불어넣는 시기입니다."
          ],
          b: [
            "웃음 뒤에 진심 어린 말 한마디를 더하면 사이가 더 돈독해집니다.",
            "장난스러운 대화 사이사이 서로의 근황도 진지하게 물어봐 주세요.",
            "즉흥적인 만남도 좋지만 가끔은 미리 약속을 잡아 여유를 나눠보세요."
          ]
        }
      },
      honor: {
        a: [
          "순발력 있는 처신으로 주변의 호감을 사는 시기입니다.",
          "재치 넘치는 말솜씨 하나로 사람들에게 좋은 인상을 남기는 시기입니다.",
          "상황에 맞게 빠르게 대처하는 모습이 주변의 인정으로 이어지는 시기입니다."
        ],
        b: [
          "가벼운 이미지를 벗고 싶다면 꾸준한 성실함도 함께 보여주세요.",
          "재치만큼 진지한 순간의 무게감도 이따금 보여주면 신뢰가 두터워집니다.",
          "가벼워 보이는 인상을 바꾸고 싶다면 약속을 지키는 모습부터 쌓아보세요."
        ]
      },
      moving: {
        a: [
          "괜찮은 자리가 나왔다는 소식을 재빠르게 알아채는 시기입니다.",
          "여러 매물 정보를 발 빠르게 훑어보며 좋은 자리를 먼저 찜하는 시기입니다.",
          "새로운 동네에 대한 호기심으로 이사를 즐거운 도전처럼 여기는 시기입니다."
        ],
        b: [
          "조급한 마음에 계약 조건을 대충 넘기지 않도록 꼼꼼히 살펴보세요.",
          "발 빠른 결정도 좋지만 계약서의 작은 글씨까지 놓치지 마세요.",
          "호기심에 이끌려 현실적인 비교를 건너뛰는 일은 없도록 하세요."
        ]
      },
      children: {
        a: [
          "아이와 재미있는 놀이를 함께 만들어가며 웃음이 끊이지 않는 시기입니다.",
          "기발한 놀이 아이디어로 함께하는 시간을 늘 새롭게 채우는 시기입니다.",
          "아이의 엉뚱한 질문에도 재치 있게 답해주며 호기심을 북돋는 시기입니다."
        ],
        b: [
          "놀이 뒤에는 차분히 마무리하는 습관도 함께 알려주세요.",
          "재미있는 순간만큼 아이와 차분히 눈을 맞추는 시간도 마련해보세요.",
          "새로운 놀이도 좋지만 아이가 정한 규칙을 지키는 법도 넌지시 짚어주세요."
        ]
      }
    }
  },
```

- [ ] **Step 2: 나머지 5개 띠(닭띠, 개띠, 돼지띠, 쥐띠, 소띠)를 같은 구조로 변환**

각 띠(`data/ddi-data.js`의 각 `DDI_DATA` 항목)에 대해:

1. 기존 `trait`(두 문장)를 `{ a: [문장1], b: [문장2] }`로 나눈다. 기존 `categories`의 19개 필드(세분화 8개×2 + 단일 3개)도 각각 기존 첫 문장→`a[0]`, 기존 둘째(또는 셋째) 문장→`b[0]`으로 나눈다. **문장이 3개인 필드는 첫 문장을 `a[0]`, 나머지 문장 전체(공백으로 이어붙임)를 `b[0]`으로 취급한다.**
2. `a[1]`/`a[2]`(관찰절 변형 2개)와 `b[1]`/`b[2]`(조언절 변형 2개)를 새로 쓴다. `a[0]`/`b[0]`과 다른 구체적 상황·표현을 쓰되, 같은 필드(같은 띠+카테고리+서브키)의 주제 범위 안에서 작성한다 — 다른 필드의 내용을 끌어오지 않는다.
3. `keywords`에 그 띠의 성격을 반영한 신규 3개를 기존 3개 뒤에 추가한다(총 6개, 기존 3개와 겹치지 않게).
4. `advice`에 신규 2개를 기존 1개(이제 인덱스 0) 뒤에 추가한다(총 3개).
5. **같은 필드 안에서 `a`풀 3개(또는 `b`풀 3개)가 "[형용사구]+[동일 명사/동사]" 같은 하나의 문형에 단어만 바꿔 끼운 mad-libs 패턴이 되지 않도록 주의한다** — monkey의 최초 초안에서 `trait.a`가 전부 "OO한 원숭이띠는 ~" 패턴을 반복해 스윕에서 걸렸고, "원숭이띠는"을 변형 문장에서 아예 빼는 방식으로 고쳤다(위 Step 1 최종본 참고). 이처럼 주어/문장 구조 자체를 바꿔서 변형하라.
6. 문자열은 기존 파일 스타일대로 큰따옴표(`"..."`)를 사용한다.

- [ ] **Step 3: 스윕 스크립트 작성**

프로젝트 루트에 임시 파일 `scratch-dedup-check.js`(작업 완료 후 삭제, 커밋하지 않음)로 저장하고 `node scratch-dedup-check.js`로 실행한다. Global Constraints에서 정한 두 축(필드 내부 자기중복은 `a`/`b` 모두 3단 결합, 금지쌍은 `a`만 3단 결합·`b`는 단순 word-Jaccard)을 그대로 구현한다:

```javascript
const { DDI_DATA } = require('./data/ddi-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./tests/helpers/dedup.js');

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;

function fullCombinedCheck(s1, s2, keywords, label) {
  const issues = [];
  const wj = wordJaccard(s1, s2);
  if (wj >= WORD_TH) issues.push('word=' + wj.toFixed(2));
  const tj = trigramJaccard(s1, s2);
  if (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH) issues.push('word+tri=' + wj.toFixed(2) + '/' + tj.toFixed(2));
  const kw1 = stripOwnKeywords(s1, keywords), kw2 = stripOwnKeywords(s2, keywords);
  const t1 = stripBoilerplateSuffix(kw1), t2 = stripBoilerplateSuffix(kw2);
  const lcs = longestCommonSubstring(t1, t2);
  const bj = bigramJaccard(t1, t2);
  const st1 = significantStems(s1, keywords), st2 = significantStems(s2, keywords);
  const shared = [...new Set(st1.filter(x => st2.includes(x)))];
  if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) {
    issues.push('lcs=' + lcs + ' stems=' + shared.join(',') + ' bigram=' + bj.toFixed(3));
  }
  if (issues.length) { console.log('[' + label + '] ' + issues.join(' | ') + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}

function simpleWordCheck(s1, s2, label) {
  const wj = wordJaccard(s1, s2);
  if (wj >= WORD_TH) { console.log('[' + label + '] word=' + wj.toFixed(2) + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}

const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];

function getField(ddi, cat, sub) {
  return sub ? ddi.categories[cat][sub] : ddi.categories[cat];
}

let found = 0;
// 지금까지 작성된 띠만 검사 대상(원숭이띠 포함, 아직 문자열인 미작성 띠는 건너뜀)
DDI_DATA.filter(ddi => typeof ddi.trait === 'object').forEach(ddi => {
  const allFields = [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).flatMap(cat => SUBDIVIDED_CATEGORIES[cat].map(sub => [cat, sub])))
    .concat(SINGLE_CATEGORIES.map(cat => [cat, null]));

  // 1) 필드 내부 자기중복 (a/b 모두 3단 결합)
  allFields.forEach(([cat, sub]) => {
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    ['a', 'b'].forEach(slot => {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          if (fullCombinedCheck(pool[i], pool[j], ddi.keywords, ddi.name_kr + ' WITHIN ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + ']')) found++;
        }
      }
    });
  });

  // 1b) advice 풀 자기중복 (짧은 단문 3개, 단순 word-Jaccard만 — b풀과 동일한 강도)
  for (let i = 0; i < ddi.advice.length; i++) {
    for (let j = i + 1; j < ddi.advice.length; j++) {
      if (simpleWordCheck(ddi.advice[i], ddi.advice[j], ddi.name_kr + ' ADVICE-POOL [' + i + ',' + j + ']')) found++;
    }
  }

  // 2) 금지쌍 (a는 3단 결합, b는 단순 word-Jaccard만)
  FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
    subsA.forEach(subA => subsB.forEach(subB => {
      const fA = getField(ddi, catA, subA), fB = getField(ddi, catB, subB);
      fA.a.forEach((sA, i) => fB.a.forEach((sB, j) => {
        if (fullCombinedCheck(sA, sB, ddi.keywords, ddi.name_kr + ' FORBIDDEN-A ' + catA + '.' + subA + '.a' + i + ' vs ' + catB + '.' + subB + '.a' + j)) found++;
      }));
      fA.b.forEach((sA, i) => fB.b.forEach((sB, j) => {
        if (simpleWordCheck(sA, sB, ddi.name_kr + ' FORBIDDEN-B ' + catA + '.' + subA + '.b' + i + ' vs ' + catB + '.' + subB + '.b' + j)) found++;
      }));
    }));
  });
});
console.log('Found ' + found + ' issues');
```

`Found 0 issues`가 나올 때까지 충돌이 발견된 새 변형 문장(인덱스 1·2)을 수정하고 재실행한다. **인덱스 0(기존 문장)은 절대 수정하지 않는다.** 몽키띠는 이미 검증되었으므로 이 스크립트를 돌리면 몽키띠 관련 항목은 0건이어야 한다 — 0건이 아니면 Step 1의 붙여넣기 과정에서 오타가 생긴 것이니 원문과 다시 대조한다. 통과 후 `scratch-dedup-check.js`는 삭제한다.

- [ ] **Step 4: 구조 확인**

Read 도구로 방금 작성한 6개 띠(monkey, rooster, dog, pig, rat, ox) 전체를 다시 읽어 다음을 육안으로 확인한다: `trait`/카테고리 19개 필드 전부 `a`/`b` 배열이 정확히 3개씩인지, `keywords`가 6개인지, `advice`가 3개인지, 기존 인덱스 0 문장이 원본과 바이트 단위로 동일한지.

- [ ] **Step 5: 커밋**

```bash
git add data/ddi-data.js
git commit -m "content(ddi): convert monkey/rooster/dog/pig/rat/ox to a/b pool structure for random readings"
```

---

## Task 2: `data/ddi-data.js` 콘텐츠 변환 — Part B (나머지 6개 띠)

**Files:**
- Modify: `data/ddi-data.js`

**Interfaces:**
- Consumes: Task 1이 만든 6개 띠의 `{a,b}` 구조(패턴 참고용), `scratch-dedup-check.js`와 동일한 스윕 로직
- Produces: `DDI_DATA[6..11]`(tiger, rabbit, dragon, snake, horse, goat)도 동일한 `{a,b}` 구조로 변경 — 이 태스크가 끝나면 `DDI_DATA` 12개 항목 전부가 새 구조를 갖는다.

- [ ] **Step 1: 나머지 6개 띠(호랑이띠, 토끼띠, 용띠, 뱀띠, 말띠, 양띠)를 Task 1 Step 2와 동일한 방법으로 변환**

Task 1 Step 2의 1~6번 규칙을 그대로 적용한다. 원숭이띠(잠긴 참조)와 Task 1에서 작성한 5개 띠의 최종 결과물을 스타일 참고용으로 사용한다.

- [ ] **Step 2: 스윕 스크립트 재실행 (전체 12개 띠 대상)**

Task 1 Step 3의 `scratch-dedup-check.js`를 다시 만들어(또는 파일이 남아있다면 재사용) `node scratch-dedup-check.js`로 실행한다. 이번엔 `DDI_DATA.filter(ddi => typeof ddi.trait === 'object')` 조건에 12개 띠 전부가 걸리므로 전체가 검사 대상이다. `Found 0 issues`가 나올 때까지 새로 쓴 6개 띠의 변형 문장을 수정한다(Task 1에서 이미 검증된 6개 띠는 수정하지 않는다 — 만약 그쪽에서 충돌이 뜬다면 새로 쓴 6개 띠 문장을 바꿔서 해결한다). 통과 후 `scratch-dedup-check.js` 삭제(커밋하지 않음).

- [ ] **Step 3: 구조 확인**

12개 띠 전체를 Read 도구로 다시 읽어 다음을 확인한다: 모든 띠에서 `trait`/19개 카테고리 필드가 `a`/`b` 각 3개 배열인지, `keywords` 6개, `advice` 3개, 기존 인덱스 0 문장이 원본과 동일한지.

- [ ] **Step 4: 커밋**

```bash
git add data/ddi-data.js
git commit -m "content(ddi): convert tiger/rabbit/dragon/snake/horse/goat to a/b pool structure for random readings"
```

---

## Task 3: 영구 회귀 테스트 재작성 (`tests/ddi-data.test.js`)

**Files:**
- Modify: `tests/ddi-data.test.js`

**Interfaces:**
- Consumes: Task 1+2가 완성한 `DDI_DATA`의 `{a,b}`/풀 구조, `tests/helpers/dedup.js`의 기존 export(신규 함수 불필요)
- Produces: 없음(테스트 파일)

기존 `tests/ddi-data.test.js`는 구 구조(문자열 필드) 기준이라 전체를 새 구조 기준으로 다시 쓴다.

- [ ] **Step 1: 파일 전체를 다음으로 교체**

```javascript
const assert = require('assert');
const { DDI_DATA, getDdiByYear } = require('../data/ddi-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const EXPECTED_KEYS = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat'];
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];

function getField(ddi, cat, sub) {
  return sub ? ddi.categories[cat][sub] : ddi.categories[cat];
}

function assertPool(field, label) {
  assert.ok(field && typeof field === 'object' && !Array.isArray(field), label + ' must be an {a,b} object');
  ['a', 'b'].forEach(function (slot) {
    assert.ok(Array.isArray(field[slot]) && field[slot].length === 3, label + '.' + slot + ' must be an array of exactly 3 strings');
    field[slot].forEach(function (s, i) {
      assert.ok(typeof s === 'string' && s.length > 0, label + '.' + slot + '[' + i + '] must be a non-empty string');
    });
  });
}

// ---------------------------------------------------------------------------
// 구조 검증
// ---------------------------------------------------------------------------

assert.strictEqual(DDI_DATA.length, 12, '띠는 12개여야 함');
assert.deepStrictEqual(DDI_DATA.map(d => d.key), EXPECTED_KEYS, '기존 배열 순서와 key가 일치해야 함');

DDI_DATA.forEach(function (ddi) {
  assertPool(ddi.trait, ddi.key + '.trait');

  assert.ok(Array.isArray(ddi.keywords) && ddi.keywords.length === 6,
    ddi.key + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(ddi.keywords).size, 6, ddi.key + ' keywords must all be distinct');

  assert.ok(Array.isArray(ddi.advice) && ddi.advice.length === 3,
    ddi.key + ' advice must be an array of exactly 3 items');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (sub) {
      assertPool(getField(ddi, cat, sub), ddi.key + '.categories.' + cat + '.' + sub);
    });
  });
  SINGLE_CATEGORIES.forEach(function (cat) {
    assertPool(getField(ddi, cat, null), ddi.key + '.categories.' + cat);
  });
});

console.log('All 12 ddi signs have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

// ---------------------------------------------------------------------------
// 중복 검사 — 두 축: (1) 필드 내부 자기중복(a/b 모두 3단 결합), (2) 금지쌍(a만 3단 결합, b는 단순 word-Jaccard)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;

function fullCombinedIssues(s1, s2, keywords) {
  const issues = [];
  const wj = wordJaccard(s1, s2);
  if (wj >= WORD_TH) issues.push('word=' + wj.toFixed(2));
  const tj = trigramJaccard(s1, s2);
  if (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH) issues.push('word+tri=' + wj.toFixed(2) + '/' + tj.toFixed(2));
  const kw1 = stripOwnKeywords(s1, keywords), kw2 = stripOwnKeywords(s2, keywords);
  const t1 = stripBoilerplateSuffix(kw1), t2 = stripBoilerplateSuffix(kw2);
  const lcs = longestCommonSubstring(t1, t2);
  const bj = bigramJaccard(t1, t2);
  const st1 = significantStems(s1, keywords), st2 = significantStems(s2, keywords);
  const shared = [...new Set(st1.filter(function (x) { return st2.indexOf(x) !== -1; }))];
  if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) {
    issues.push('lcs=' + lcs + ' stems=' + shared.join(',') + ' bigram=' + bj.toFixed(3));
  }
  return issues;
}

const withinFieldCollisions = [];
DDI_DATA.forEach(function (ddi) {
  const allFields = [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));

  allFields.forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const issues = fullCombinedIssues(pool[i], pool[j], ddi.keywords);
          if (issues.length) {
            withinFieldCollisions.push(ddi.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
          }
        }
      }
    });
  });
});

assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));

console.log('No within-field a/b pool self-collisions (each field\'s own 3 variants are sufficiently distinct)');

const adviceCollisions = [];
DDI_DATA.forEach(function (ddi) {
  for (let i = 0; i < ddi.advice.length; i++) {
    for (let j = i + 1; j < ddi.advice.length; j++) {
      const wj = wordJaccard(ddi.advice[i], ddi.advice[j]);
      if (wj >= WORD_TH) {
        adviceCollisions.push(ddi.name_kr + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + ddi.advice[i] + '\n  ' + ddi.advice[j]);
      }
    }
  }
});

assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));

console.log('No advice-pool self-collisions (each sign\'s 3 advice variants are sufficiently distinct)');

const forbiddenACollisions = [];
const forbiddenBCollisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const fA = getField(ddi, catA, subA), fB = getField(ddi, catB, subB);
        fA.a.forEach(function (sA, i) {
          fB.a.forEach(function (sB, j) {
            const issues = fullCombinedIssues(sA, sB, ddi.keywords);
            if (issues.length) {
              forbiddenACollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + '.a' + i + ' <-> ' + catB + '.' + subB + '.a' + j + ' (' + issues.join(' | ') + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
        fA.b.forEach(function (sA, i) {
          fB.b.forEach(function (sB, j) {
            const wj = wordJaccard(sA, sB);
            if (wj >= WORD_TH) {
              forbiddenBCollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + '.b' + i + ' <-> ' + catB + '.' + subB + '.b' + j + ' (word=' + wj.toFixed(2) + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
      });
    });
  });
});

assert.strictEqual(forbiddenACollisions.length, 0,
  'Found ' + forbiddenACollisions.length + ' forbidden-pair a-pool collisions:\n' + forbiddenACollisions.join('\n'));
console.log('No forbidden-pair a-pool collisions (love/relationships, career/workplace, money/business)');

assert.strictEqual(forbiddenBCollisions.length, 0,
  'Found ' + forbiddenBCollisions.length + ' forbidden-pair b-pool collisions:\n' + forbiddenBCollisions.join('\n'));
console.log('No forbidden-pair b-pool collisions (simple word-Jaccard sweep)');

// ---------------------------------------------------------------------------
// getDdiByYear() 회귀 확인
// ---------------------------------------------------------------------------

assert.strictEqual(getDdiByYear(2004).key, 'monkey', 'getDdiByYear(2004) should resolve to monkey');
assert.strictEqual(getDdiByYear(1996).key, 'rat', 'getDdiByYear(1996) should resolve to rat');
assert.strictEqual(getDdiByYear(-4).key, 'dragon', 'getDdiByYear(-4) should normalize negative modulo to dragon');

console.log('getDdiByYear() correctly resolves known years including the negative-modulo edge case');

console.log('All ddi-data tests passed');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/ddi-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 실패하면 Task 1/2로 돌아가 해당 필드(항상 인덱스 1 또는 2)를 수정한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add tests/ddi-data.test.js
git commit -m "test(ddi): rewrite structure and dedup regression tests for a/b pool structure"
```

---

## Task 4: `js/app.js` — 랜덤 조합 렌더링 헬퍼 추가

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: 없음(기존 `resolveCategoryMeaning`/`renderKeywordsAdviceHtml`을 확장)
- Produces: 신규 헬퍼 `pickRandom(arr)`, `resolveMeaningText(value)`, `pickKeywords(keywordsPool, count)`, `pickAdvice(advicePool)`. `resolveCategoryMeaning`/`renderKeywordsAdviceHtml`은 시그니처 불변, 내부만 확장.

**이 태스크는 문자열 입력에서 기존과 동일하게 동작해야 한다(하위 호환)** — 띠운세를 제외한 4개 모드는 여전히 문자열/단일 advice/3개 keywords를 쓰므로 동작이 전혀 바뀌지 않아야 한다.

- [ ] **Step 1: 4개 신규 헬퍼 추가**

`js/app.js`에서 `resolveCategoryMeaning`/`renderKeywordsAdviceHtml` 정의(현재 286~298행) 바로 앞에 추가:

```javascript
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function resolveMeaningText(value) {
    return (typeof value === 'string') ? value : (pickRandom(value.a) + ' ' + pickRandom(value.b));
  }

  function pickKeywords(keywordsPool, count) {
    count = count || 3;
    if (!keywordsPool || keywordsPool.length <= count) return keywordsPool;
    const shuffled = keywordsPool.slice().sort(function () { return Math.random() - 0.5; });
    return shuffled.slice(0, count);
  }

  function pickAdvice(advicePool) {
    return Array.isArray(advicePool) ? pickRandom(advicePool) : advicePool;
  }
```

- [ ] **Step 2: `resolveCategoryMeaning`을 `resolveMeaningText` 사용으로 수정**

현재 코드(286~292행):

```javascript
  function resolveCategoryMeaning(entity, category, period, selectedSubChoice) {
    if (category && entity.categories[category]) {
      const readingText = resolveSubchoiceValue(category, entity.categories[category], selectedSubChoice);
      return PERIOD_PREFIXES[period] + ' ' + readingText;
    }
    return entity.trait;
  }
```

다음으로 교체:

```javascript
  function resolveCategoryMeaning(entity, category, period, selectedSubChoice) {
    if (category && entity.categories[category]) {
      const readingText = resolveSubchoiceValue(category, entity.categories[category], selectedSubChoice);
      return PERIOD_PREFIXES[period] + ' ' + resolveMeaningText(readingText);
    }
    return resolveMeaningText(entity.trait);
  }
```

- [ ] **Step 3: `renderKeywordsAdviceHtml`을 `pickKeywords`/`pickAdvice` 사용으로 수정**

현재 코드(294~298행):

```javascript
  function renderKeywordsAdviceHtml(keywordsList, adviceText) {
    return (keywordsList && adviceText)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + keywordsList.join(' · ') + '</p><p class="card-advice">조언: ' + adviceText + '</p></div>'
      : '';
  }
```

다음으로 교체:

```javascript
  function renderKeywordsAdviceHtml(keywordsList, adviceText) {
    const resolvedKeywords = pickKeywords(keywordsList);
    const resolvedAdvice = pickAdvice(adviceText);
    return (resolvedKeywords && resolvedAdvice)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + resolvedKeywords.join(' · ') + '</p><p class="card-advice">조언: ' + resolvedAdvice + '</p></div>'
      : '';
  }
```

이 두 함수는 `showZodiacSummary`/`showDdiSummary`/`showSajuSummary`/`showCompatibilitySummary`/타로 `showSummary`가 이미 호출하고 있으므로(각각 415-416행, 445-446행, 655-657행, 688행, 774-776행 부근), **호출부 코드는 전혀 수정하지 않는다.**

- [ ] **Step 4: 문법 검증**

Run: `node --check js/app.js`
Expected: 에러 없이 종료.

- [ ] **Step 5: 전체 회귀 테스트 실행**

Run:
```bash
node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js && node tests/ddi-data.test.js
```
Expected: 전부 통과. (`node scripts/run-tests.js`로 한 번에 실행해도 동일)

- [ ] **Step 6: 커밋**

```bash
git add js/app.js
git commit -m "feat(app): resolve string or a/b-pool category text and pool-sampled keywords/advice at render time"
```

---

## Task 5: 브라우저 확인 (5개 모드 전부)

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~4의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node scripts/run-tests.js`
Expected: 10개 테스트 파일 전부 통과.

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. **띠운세(신규 랜덤화) — 같은 선택 반복**: 띠운세 모드 → 임의 출생연도 입력 → "연애운" → "솔로" 선택 후 리딩 실행. 결과 화면의 해설 문장·키워드·조언을 기록해둔다.
2. "새로운 리딩" 버튼으로 돌아가 **정확히 같은 선택**(같은 연도/카테고리/서브초이스)으로 5~6회 반복 실행한다. 매번 해설 문장이나 키워드 조합, 조언 중 최소 하나는 이전과 달라지는지 확인한다(완전 동일한 조합이 연속으로 나올 수도 있지만 5~6회 반복하면 최소 한 번은 달라져야 함 — 순수 랜덤이므로 100% 보장은 아니지만 조합 수가 충분히 많아 실제로는 거의 항상 달라진다).
3. 매번 나오는 해설이 문맥상 자연스러운지(어색한 조합이 없는지) 확인한다.
4. "명예운"(단일 카테고리) 선택 후에도 동일하게 반복 실행해 문장이 달라지는지 확인한다.
5. "오늘의운"(카테고리 미선택, `trait` 폴백)도 반복 실행해 문장이 달라지는지 확인한다.
6. **회귀 — 타로**: 타로 모드로 카드 뽑기 → 카테고리 선택 포함해 결과 확인. 정/역방향 해설과 키워드/조언이 기존과 동일한 방식으로 나오는지 확인(고정 문구, 랜덤화되지 않음).
7. **회귀 — 사주**: 사주 모드로 생년월일 입력 → 리딩 실행. 명식표·오행 균형 문장·카테고리 해설·키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
8. **회귀 — 별자리**: 별자리 모드로 리딩 실행. 해설·키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
9. **회귀 — 궁합**: 궁합 모드로 리딩 실행. 점수·해설·키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
10. "지난 기록"을 열어 방금 만든 띠운세 리딩들이 정상적으로 표시되는지 확인.
11. 콘솔에 에러가 없는지 확인.

Expected: 띠운세(1~5)는 반복 시 결과가 달라지고 문맥이 자연스러움, 타로/사주/별자리/궁합(6~9)은 리팩토링 이전과 완전히 동일한 고정 문구, 10~11 정상.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인**

이 태스크는 검증 전용이라 기본적으로 커밋이 없다. Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(ddi): ...` 또는 `fix(app): ...` 커밋을 추가한다.
