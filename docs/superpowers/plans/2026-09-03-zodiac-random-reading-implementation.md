# 리딩 랜덤화 — 별자리 단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/zodiac-data.js`의 12궁 `trait`/카테고리 본문을 "관찰절(A)+조언절(B)" 슬롯 배열(`{a:[...3], b:[...3]}`)로, `keywords`(3→6)/`advice`(1→3)를 풀로 확장해 별자리 리딩이 매번 랜덤하게 달라지도록 만든다. 띠운세 파일럿에서 검증한 방식을 그대로 이식하며, `js/app.js`는 전혀 건드리지 않는다(기존 헬퍼가 이미 문자열/풀 양쪽을 처리하도록 범용적으로 구현되어 있음).

**Architecture:** 데이터 스키마·렌더링 방식은 띠운세와 동일. 차이는 dedup 검사 범위 — 띠운세 최종 리뷰에서 나온 교훈에 따라 "advice 풀 ↔ 모든 b풀(같은 화면에 함께 렌더되는 `trait.b`+`advice`) echo 검사"를 이번엔 Task 1부터 포함한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음). Node `assert` 기반 테스트, `tests/helpers/dedup.js`의 기존 공유 함수 재사용(신규 export 불필요).

## Global Constraints

- 대상은 `data/zodiac-data.js`(12궁) 하나뿐이다. `js/app.js`, 다른 모드의 데이터 파일은 이 플랜에서 전혀 수정하지 않는다 — `resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()`가 이미 문자열/`{a,b}` 객체, 고정 배열/풀 배열을 모두 처리하도록 범용적으로 구현되어 있어 별자리 전용 코드 변경이 필요 없다(`js/app.js:279-327`, 띠운세 단계에서 확정됨).
- 각 필드(카테고리 본문 19개 + `trait` 1개, 궁당 20개)의 **기존 값이 새 배열의 인덱스 0(`a[0]`/`b[0]`)이 되어야 하며, 절대 수정하지 않는다** — 기존 필드는 이미 "관찰절(1문장)+조언절(1문장)" 두 문장으로 쓰여 있으므로 그 경계 그대로 나눈다.
- 신규 변형은 슬롯당 2개씩 추가해 풀 크기를 3으로 만든다(`a`/`b` 각 정확히 3개).
- `keywords`는 3개(기존, 순서 유지) + 3개(신규, 뒤에 추가) = 정확히 6개 배열(distinct). `advice`는 기존 문자열이 인덱스 0이 되고 신규 2개를 추가해 정확히 3개 배열.
- 재추첨(연속 동일 조합 방지) 로직은 만들지 않는다 — 순수 랜덤(띠운세 단계에서 사용자 확인 완료).
- **잠긴 참조**: `key: "aries"`(양자리) — 아래 Task 1 Step 1에 실제 dedup 알고리즘으로 검증(4개 축 전부 0건 확인됨)까지 마친 최종 콘텐츠가 그대로 제공되어 있다. **이 블록은 절대 수정하지 않는다.**
- `name_en`/`dateRange` 등 랜덤화와 무관한 기존 필드는 변경하지 않는다.
- 세분화 카테고리·서브키, 금지쌍은 띠운세와 완전히 동일: `love`(solo/couple)↔`relationships`(new/existing), `career`(jobseek/switch)↔`workplace`(team/personal), `money`(consumption/invest)↔`business`(startup/running). 단일 카테고리는 `honor`/`moving`/`children`.
- **중복검사는 네 축**(띠운세 파일럿의 세 축 + 신규 한 축):
  1. **필드 내부 자기중복**: 같은 필드의 `a`풀 3개끼리, `b`풀 3개끼리 각각 3단 결합(word-Jaccard≥0.3 전체 스윕 + word≥0.20∧trigram≥0.15 결합 + LCS≥5∨어근중복≥2∨bigram≥0.185 결합, 상투구·자기 keywords 제거 후) 적용.
  2. **금지쌍(cross-category)**: 같은 궁 안에서 `a`풀은 3단 결합 전체(3×3 전수), **`b`풀은 word-Jaccard≥0.3 단순 스윕만**(이유: `b[0]`끼리는 이미 잠긴 기존 문장이라 3단 결합 적용 시 수정 불가능한 충돌이 발생할 수 있음 — 띠운세에서 실제로 확인됨).
  3. **advice 풀 자기중복**: 궁당 advice 3개끼리 word-Jaccard≥0.3 단순 스윕.
  4. **(신규) advice↔b풀 echo**: 모든 `advice[i]`를 그 궁의 모든 필드의 `b[j]`(19개 카테고리 `b`풀 + `trait.b`)와 word-Jaccard≥0.3 단순 스윕으로 비교 — `showZodiacSummary()`가 카테고리 미선택("오늘의운") 시 `trait`(a+b)와 `advice`를 같은 화면에 나란히 렌더하기 때문(띠운세 최종 리뷰에서 뱀띠 `trait.b[1]`/`advice[1]` 충돌이 이 축 없이 처음엔 통과됐다가 최종 리뷰에서야 발견된 전례가 있음 — 이번엔 처음부터 포함).
  - `stripOwnKeywords`/`stripBoilerplateSuffix`용 상투구 목록에 A절 종결형(`시기입니다`/`것입니다`/`합니다`)과 B절(조언절) 종결형(`해보세요`/`주세요`/`두세요`/`하세요`/`보세요`/`세요`) 둘 다 포함한다.
  - **범위 밖(사용자 확인 완료)**: 같은 궁 내 비금지쌍 카테고리 교차, 궁 간 같은 필드 교차 dedup은 이번 단계에서 하지 않는다(사주 단계에서 재검토).
- `data/zodiac-data.js`는 기존에 큰따옴표(`"..."`) 스타일을 쓴다 — 그대로 따른다.

---

## Task 1: `data/zodiac-data.js` 콘텐츠 변환 — Part A (양자리[잠긴 참조] + 5개 궁)

**Files:**
- Modify: `data/zodiac-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `ZODIAC_DATA[0..5]`(aries, taurus, gemini, cancer, leo, virgo)의 `trait`/`categories.*`가 `{a:[...3], b:[...3]}` 구조로, `keywords`가 6개 배열로, `advice`가 3개 배열로 변경됨. Task 2가 나머지 6개 궁에 동일 구조를 적용하고, Task 3(테스트)이 이 새 구조를 전제로 동작한다.

- [ ] **Step 1: "양자리" 항목을 아래 잠긴 참조 콘텐츠로 정확히 교체**

`data/zodiac-data.js`의 첫 번째 `ZODIAC_DATA` 항목(`key: "aries"`, 현재 2~44행)을 다음으로 통째로 교체한다. **이 콘텐츠는 이미 실제 dedup 스윕 스크립트(4개 축 전부)로 검증되어 충돌 0건임이 확인되었다 — 한 글자도 수정하지 않는다.** `name_en`/`dateRange`는 원본 그대로 유지한다.

```js
  {
    key: "aries", name_kr: "양자리", name_en: "Aries", dateRange: "3/21 ~ 4/19",
    trait: {
      a: [
        "열정적이고 리더십이 강한 양자리는 망설임 없이 도전하는 힘을 가졌습니다.",
        "생각이 서면 곧장 몸이 먼저 움직이는 저돌적인 기질을 지녔습니다.",
        "어떤 상황에서도 앞장서길 주저하지 않는 대담함이 돋보입니다."
      ],
      b: [
        "다만 성급함을 조심하면 더 큰 성과를 얻을 수 있어요.",
        "그 힘을 끝까지 밀고 나가는 끈기를 더하면 결실이 배가됩니다.",
        "앞서가는 만큼 주변을 살피는 여유를 곁들이면 신뢰가 두터워집니다."
      ]
    },
    keywords: ["열정", "리더십", "추진력", "당당함", "도전정신", "박력"],
    advice: [
      "성급함만 조심하면 원하는 결과를 빠르게 손에 넣을 수 있어요.",
      "거침없는 추진력에 잠깐의 신중함을 더하면 실수 없이 목표에 닿아요.",
      "먼저 움직이는 용기만큼 마무리까지 챙기면 성과가 오래갑니다."
    ],
    categories: {
      love: {
        solo: {
          a: [
            "먼저 다가가는 적극적인 매력이 상대의 마음을 사로잡는 시기입니다.",
            "호감이 생기면 곧장 다가가 안부를 묻는 시기입니다.",
            "숨기지 않는 솔직한 호감 표현이 상대의 시선을 붙드는 시기입니다."
          ],
          b: [
            "고백을 망설이기보다 감정을 솔직하게 드러내는 편이 유리합니다.",
            "속도만큼 상대의 반응도 살피는 여유를 잊지 마세요.",
            "저돌적인 태도가 부담스럽지 않도록 완급 조절도 함께 해보세요."
          ]
        },
        couple: {
          a: [
            "함께하는 시간에 활기를 불어넣는 열정이 관계를 뜨겁게 만드는 시기입니다.",
            "즉흥적인 데이트 제안으로 연인에게 신선한 즐거움을 안겨주는 시기입니다.",
            "숨김없이 애정을 표현하며 관계에 열기를 더하는 시기입니다."
          ],
          b: [
            "그만큼 연인의 속도도 배려하는 여유를 가져보세요.",
            "뜨거운 마음만큼 차분히 귀 기울이는 시간도 함께 가져보세요.",
            "열기만 앞세우지 말고 상대의 마음이 따라오는지도 살펴보세요."
          ]
        }
      },
      money: {
        consumption: {
          a: [
            "마음에 드는 것에는 망설임 없이 지갑을 여는 시기입니다.",
            "갖고 싶은 게 생기면 곧바로 결제 버튼을 누르는 시기입니다.",
            "눈에 띄는 물건을 보면 고민 없이 손이 먼저 나가는 시기입니다."
          ],
          b: [
            "즉흥적인 소비가 이어지지 않도록 미리 한도를 정해두는 것이 좋습니다.",
            "지르기 전에 하루만 미뤄보면 후회를 줄일 수 있습니다.",
            "충동적인 지출이 쌓이지 않도록 결제 내역을 가끔 점검해보세요."
          ]
        },
        invest: {
          a: [
            "좋은 기회다 싶으면 과감히 뛰어드는 결단력이 재정에 도움이 되는 시기입니다.",
            "확신이 서는 순간 지체 없이 자금을 움직이는 배짱이 발휘되는 시기입니다.",
            "촉이 왔다 싶으면 재빨리 움직여 남들보다 앞서 챙기는 시기입니다."
          ],
          b: [
            "다만 뛰어들기 전에 최소한의 정보는 확인하고 움직이세요.",
            "속도에 취해 분산 없이 몰아넣지 않도록 조심하세요.",
            "과감함 뒤에 손절 기준도 미리 세워두면 손실을 줄일 수 있습니다."
          ]
        }
      },
      career: {
        jobseek: {
          a: [
            "새로운 도전을 두려워하지 않는 추진력으로 원하는 자리를 향해 나아가는 시기입니다.",
            "낯선 분야라도 겁내지 않고 지원서를 넣는 시기입니다.",
            "패기 넘치는 자세로 승부처마다 정면으로 부딪히는 시기입니다."
          ],
          b: [
            "면접에서 보여주는 당당한 태도가 강한 인상을 남길 수 있어요.",
            "당당함 뒤에 구체적인 준비도 함께 갖추면 설득력이 커집니다.",
            "자신감이 지나쳐 무모하게 비치지 않도록 균형을 잡아보세요."
          ]
        },
        switch: {
          a: [
            "지금과 다른 길을 향한 결단이 빠르게 이루어지는 시기입니다.",
            "새로운 도전을 향한 마음이 서면 곧바로 행동에 옮기는 시기입니다.",
            "지금 자리가 답답하게 느껴져 변화를 서두르게 되는 시기입니다."
          ],
          b: [
            "감정에 휩쓸린 선택은 아닌지 잠시 되짚어보는 것이 좋습니다.",
            "홧김에 내린 결정은 아닌지 하루 정도 묵혀두고 다시 보세요.",
            "결단은 빠르되 이직 후의 조건은 꼼꼼히 확인해두세요."
          ]
        }
      },
      workplace: {
        team: {
          a: [
            "주도적으로 나서서 팀 분위기를 이끄는 리더십이 돋보이는 시기입니다.",
            "회의에서 먼저 목소리를 내며 방향을 제시하는 시기입니다.",
            "막힌 상황일수록 앞장서서 돌파구를 찾아내는 시기입니다."
          ],
          b: [
            "팀원들의 의견에도 귀 기울이면 협업이 한결 매끄러워집니다.",
            "이끄는 것만큼 뒤에서 받쳐주는 역할도 존중해보세요.",
            "속도를 내는 만큼 팀원들과 보폭을 맞추는 노력도 필요합니다."
          ]
        },
        personal: {
          a: [
            "맡은 업무를 거침없이 처리해나가는 추진력이 성과로 이어지는 시기입니다.",
            "밀린 일감을 순서 없이도 척척 해치우는 시기입니다.",
            "거침없는 실행력으로 남들보다 먼저 결과물을 내놓는 시기입니다."
          ],
          b: [
            "속도만큼 꼼꼼함도 함께 챙기면 완성도가 높아집니다.",
            "빠르게 끝낸 만큼 마무리 점검도 한 번 더 해보세요.",
            "속도에 취해 놓친 부분은 없는지 다시 살펴보세요."
          ]
        }
      },
      business: {
        startup: {
          a: [
            "새로운 사업을 향한 열정이 첫걸음에 큰 추진력이 되는 시기입니다.",
            "머뭇거림 없이 사업 아이디어를 실행으로 옮기는 시기입니다.",
            "아무도 손대지 않은 영역에 첫발을 내딛는 시기입니다."
          ],
          b: [
            "의욕만큼 꼼꼼한 준비도 함께 갖추면 실패 확률을 줄일 수 있어요.",
            "열정이 앞서는 만큼 자금 계획도 꼼꼼히 세워두세요.",
            "속도를 내기 전에 최소한의 시장 검증은 거쳐보세요."
          ]
        },
        running: {
          a: [
            "활발한 에너지로 사업에 새로운 활력을 불어넣는 시기입니다.",
            "머뭇거림 없는 결단으로 정체된 흐름에 새 바람을 일으키는 시기입니다.",
            "한번 밀어붙이면 가라앉았던 사업 분위기가 되살아나는 시기입니다."
          ],
          b: [
            "성급한 확장보다 지금의 기반을 다지는 데 집중하는 편이 안전합니다.",
            "속도만 앞세우다 내부 관리가 헐거워지지 않게 챙기세요.",
            "확장에 앞서 지금의 자금 여력부터 다시 확인해보세요."
          ]
        }
      },
      study: {
        exam: {
          a: [
            "목표를 정하면 빠르게 몰입해 단기간에 성과를 내는 시기입니다.",
            "목표가 생기면 주저 없이 곧바로 몰입하는 시기입니다.",
            "짧고 굵게 파고드는 집중력으로 단기간에 실력을 끌어올리는 시기입니다."
          ],
          b: [
            "벼락치기에 의존하기보다 꾸준한 페이스를 유지하면 더 좋습니다.",
            "몰아치는 것도 좋지만 중간중간 점검하는 시간도 가지세요.",
            "속도에만 의존하지 말고 기초를 다지는 시간도 확보하세요."
          ]
        },
        path: {
          a: [
            "새로운 진로에 거침없이 도전하려는 의욕이 넘치는 시기입니다.",
            "낯선 분야라도 망설임 없이 발을 들이고 싶어지는 시기입니다.",
            "가보지 않은 분야로 마음이 자꾸 쏠리는 시기입니다."
          ],
          b: [
            "성급하게 결정하기 전에 여러 선택지를 비교해보는 것이 좋습니다.",
            "의욕이 앞서는 만큼 현실적인 준비도 함께 챙겨보세요.",
            "성급히 정하기보다 실제로 경험해보는 시도도 필요합니다."
          ]
        }
      },
      health: {
        body: {
          a: [
            "활동적인 에너지가 넘치는 시기이니 몸을 움직이는 활동이 잘 맞습니다.",
            "넘치는 힘을 주체하지 못해 자꾸 움직이게 되는 시기입니다.",
            "활동적인 하루하루가 몸에 활력을 더하는 시기입니다."
          ],
          b: [
            "다만 무리한 운동으로 몸에 부담을 주지 않도록 조심하세요.",
            "의욕만 앞세우다 부상을 입지 않도록 몸의 신호를 살피세요.",
            "속도를 내는 만큼 충분한 휴식도 함께 챙겨보세요."
          ]
        },
        mind: {
          a: [
            "넘치는 의욕이 때로 조급함으로 이어질 수 있는 시기입니다.",
            "빨리 해내고 싶은 마음이 조바심으로 번지기 쉬운 시기입니다.",
            "한발 앞서려는 욕심에 스스로를 다그치게 되는 시기입니다."
          ],
          b: [
            "잠시 숨을 고르는 여유가 마음의 균형을 지켜줍니다.",
            "잠깐 멈춰 서서 지금의 속도를 점검해보세요.",
            "조급함이 느껴질 땐 깊게 숨을 쉬고 다시 시작해보세요."
          ]
        }
      },
      relationships: {
        new: {
          a: [
            "거침없이 다가가는 당당함이 새로운 사람들과의 만남에서 빛을 발하는 시기입니다.",
            "낯선 자리에서도 먼저 나서서 분위기를 이끄는 시기입니다.",
            "망설임 없는 첫인사로 새로운 인연의 문을 여는 시기입니다."
          ],
          b: [
            "낯선 자리에서도 먼저 말을 거는 용기가 좋은 인연을 만들어줍니다.",
            "적극적인 태도만큼 상대의 속도도 살펴주세요.",
            "첫인상만큼 이어지는 대화에도 정성을 쏟으면 관계가 오래갑니다."
          ]
        },
        existing: {
          a: [
            "주도적인 태도로 모임이나 인맥 안에서 존재감을 드러내는 시기입니다.",
            "오랜 인연들 사이에서 앞장서서 모임을 이끄는 시기입니다.",
            "익숙한 얼굴들 앞에서 흥을 돋우며 분위기를 띄우는 시기입니다."
          ],
          b: [
            "목소리를 낮추고 상대 이야기에 귀 기울이는 순간도 필요합니다.",
            "이끄는 역할만큼 뒤로 물러나 지켜보는 시간도 가져보세요.",
            "주도하는 것도 좋지만 다른 사람에게도 자리를 내어주세요."
          ]
        }
      },
      honor: {
        a: [
          "당당한 행보 하나하나가 주변의 시선을 끌며 좋은 평판으로 이어지는 시기입니다.",
          "거침없는 추진력이 주변 사람들에게 강한 인상을 남기는 시기입니다.",
          "타협 없는 결단이 두고두고 회자되며 이름을 알리는 시기입니다."
        ],
        b: [
          "지나친 자기주장은 오히려 인정을 늦출 수 있으니 균형을 잡아보세요.",
          "앞서가는 모습만큼 겸손한 태도도 함께 보여주세요.",
          "당당함이 지나쳐 오만하게 비치지 않도록 주의해보세요."
        ]
      },
      moving: {
        a: [
          "새로운 곳을 향한 이동을 거침없이 결정하고 실행에 옮기는 시기입니다.",
          "마음에 든 곳이 있으면 망설이지 않고 계약을 추진하는 시기입니다.",
          "이거다 싶은 자리가 나오면 곧바로 계약서에 도장을 찍는 시기입니다."
        ],
        b: [
          "성급하게 서두르다 중요한 조건을 놓치지 않도록 한 번 더 확인해보세요.",
          "속전속결도 좋지만 계약 조건은 두 번 확인하세요.",
          "빠른 결정 뒤에 실제 생활 여건도 점검해보세요."
        ]
      },
      children: {
        a: [
          "아이와 몸을 부대끼며 활동적으로 시간을 보내는 것이 잘 맞는 시기입니다.",
          "몸으로 부딪히며 노는 놀이가 아이에게 큰 웃음을 안기는 시기입니다.",
          "가만히 있지 못하는 활력이 하루 종일 아이 곁을 맴도는 시기입니다."
        ],
        b: [
          "넘치는 에너지를 아이의 속도에 맞춰 조절하면 더욱 즐거운 시간이 됩니다.",
          "활동적인 시간만큼 차분히 마주 앉는 시간도 마련해보세요.",
          "숨 고를 틈도 함께 챙기면 아이도 더 편하게 따라옵니다."
        ]
      }
    }
  },
```

- [ ] **Step 2: 나머지 5개 궁(황소자리, 쌍둥이자리, 게자리, 사자자리, 처녀자리)에 같은 패턴 적용**

각 궁에 대해:

1. 기존 `trait`(두 문장)를 `{ a: [문장1], b: [문장2] }`로 나눈다. 기존 `categories`의 19개 필드도 각각 기존 첫 문장→`a[0]`, 기존 둘째(또는 셋째) 문장→`b[0]`으로 나눈다. 문장이 3개인 필드는 첫 문장을 `a[0]`, 나머지 문장 전체(공백으로 이어붙임)를 `b[0]`으로 취급한다. `name_en`/`dateRange`는 그대로 둔다.
2. `a[1]`/`a[2]`(관찰절 변형 2개)와 `b[1]`/`b[2]`(조언절 변형 2개)를 새로 쓴다. **주어/문장 구조 자체를 바꿔서 변형하라** — 그 별자리의 핵심 어휘(예: 양자리의 "거침없이", "망설임 없이", "추진력")를 여러 필드에서 그대로 반복하면 실제로 충돌한다(양자리 잠긴 참조 작성 중 19건이 이렇게 걸려 전부 재작성했다). 같은 필드 안에서도 마찬가지다.
3. `keywords`에 그 궁의 성격을 반영한 신규 3개를 기존 3개 뒤에 추가한다(총 6개, 기존과 겹치지 않게).
4. `advice`에 신규 2개를 기존 1개(이제 인덱스 0) 뒤에 추가한다(총 3개). **advice는 `trait.b`와 같은 화면에 나란히 렌더되므로, 새로 쓰는 advice 변형이 그 궁의 어떤 필드의 `b`풀과도 문장 뼈대를 공유하지 않는지 특히 신경 써서 작성한다.**
5. 문자열은 기존 파일 스타일대로 큰따옴표(`"..."`)를 사용한다.

- [ ] **Step 3: 스윕 스크립트 작성**

프로젝트 루트에 임시 파일 `scratch-dedup-check.js`(작업 완료 후 삭제, 커밋하지 않음)로 저장하고 `node scratch-dedup-check.js`로 실행한다. Global Constraints의 4개 축을 그대로 구현한다:

```javascript
const { ZODIAC_DATA } = require('./data/zodiac-data.js');
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

function getField(z, cat, sub) {
  return sub ? z.categories[cat][sub] : z.categories[cat];
}

let found = 0;
// 지금까지 작성된 궁만 검사 대상(양자리 포함, 아직 문자열인 미작성 궁은 건너뜀)
ZODIAC_DATA.filter(z => typeof z.trait === 'object').forEach(z => {
  const allFields = [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).flatMap(cat => SUBDIVIDED_CATEGORIES[cat].map(sub => [cat, sub])))
    .concat(SINGLE_CATEGORIES.map(cat => [cat, null]));

  // 1) 필드 내부 자기중복 (a/b 모두 3단 결합)
  allFields.forEach(([cat, sub]) => {
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    ['a', 'b'].forEach(slot => {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          if (fullCombinedCheck(pool[i], pool[j], z.keywords, z.name_kr + ' WITHIN ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + ']')) found++;
        }
      }
    });
  });

  // 1b) advice 풀 자기중복 (단순 word-Jaccard)
  for (let i = 0; i < z.advice.length; i++) {
    for (let j = i + 1; j < z.advice.length; j++) {
      if (simpleWordCheck(z.advice[i], z.advice[j], z.name_kr + ' ADVICE-POOL [' + i + ',' + j + ']')) found++;
    }
  }

  // 1c) (신규) advice ↔ 모든 b풀 echo (단순 word-Jaccard, trait.b 포함)
  allFields.forEach(([cat, sub]) => {
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    field.b.forEach((sB, j) => {
      z.advice.forEach((adv, i) => {
        if (simpleWordCheck(adv, sB, z.name_kr + ' ADVICE-ECHO advice[' + i + '] vs ' + cat + (sub ? '.' + sub : '') + '.b[' + j + ']')) found++;
      });
    });
  });

  // 2) 금지쌍 (a는 3단 결합, b는 단순 word-Jaccard만)
  FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
    subsA.forEach(subA => subsB.forEach(subB => {
      const fA = getField(z, catA, subA), fB = getField(z, catB, subB);
      fA.a.forEach((sA, i) => fB.a.forEach((sB, j) => {
        if (fullCombinedCheck(sA, sB, z.keywords, z.name_kr + ' FORBIDDEN-A ' + catA + '.' + subA + '.a' + i + ' vs ' + catB + '.' + subB + '.a' + j)) found++;
      }));
      fA.b.forEach((sA, i) => fB.b.forEach((sB, j) => {
        if (simpleWordCheck(sA, sB, z.name_kr + ' FORBIDDEN-B ' + catA + '.' + subA + '.b' + i + ' vs ' + catB + '.' + subB + '.b' + j)) found++;
      }));
    }));
  });
});
console.log('Found ' + found + ' issues');
```

`Found 0 issues`가 나올 때까지 충돌이 발견된 새 변형 문장(인덱스 1·2)을 수정하고 재실행한다. **인덱스 0(기존 문장)은 절대 수정하지 않는다.** 양자리는 이미 검증되었으므로 이 스크립트를 돌리면 양자리 관련 항목은 0건이어야 한다 — 0건이 아니면 Step 1의 붙여넣기 과정에서 오타가 생긴 것이니 원문과 다시 대조한다. 통과 후 `scratch-dedup-check.js`는 삭제한다(커밋하지 않음).

- [ ] **Step 4: 구조 확인**

Read 도구로 방금 작성한 6개 궁(aries, taurus, gemini, cancer, leo, virgo) 전체를 다시 읽어 다음을 육안으로 확인한다: `trait`/카테고리 19개 필드 전부 `a`/`b` 배열이 정확히 3개씩인지, `keywords`가 6개인지, `advice`가 3개인지, 기존 인덱스 0 문장이 원본과 바이트 단위로 동일한지, `name_en`/`dateRange`가 그대로인지.

- [ ] **Step 5: 커밋**

```bash
git add data/zodiac-data.js
git commit -m "content(zodiac): convert aries/taurus/gemini/cancer/leo/virgo to a/b pool structure for random readings"
```

---

## Task 2: `data/zodiac-data.js` 콘텐츠 변환 — Part B (나머지 6개 궁)

**Files:**
- Modify: `data/zodiac-data.js`

**Interfaces:**
- Consumes: Task 1이 만든 6개 궁의 `{a,b}` 구조(패턴 참고용), `scratch-dedup-check.js`와 동일한 스윕 로직
- Produces: `ZODIAC_DATA[6..11]`(libra, scorpio, sagittarius, capricorn, aquarius, pisces)도 동일한 `{a,b}` 구조로 변경 — 이 태스크가 끝나면 `ZODIAC_DATA` 12개 항목 전부가 새 구조를 갖는다.

- [ ] **Step 1: 나머지 6개 궁(천칭자리, 전갈자리, 사수자리, 염소자리, 물병자리, 물고기자리)을 Task 1 Step 2와 동일한 방법으로 변환**

Task 1 Step 2의 1~5번 규칙을 그대로 적용한다. 양자리(잠긴 참조)와 Task 1에서 작성한 5개 궁의 최종 결과물을 스타일 참고용으로 사용한다.

- [ ] **Step 2: 스윕 스크립트 재실행 (전체 12개 궁 대상)**

Task 1 Step 3의 `scratch-dedup-check.js`를 다시 만들어(또는 파일이 남아있다면 재사용) `node scratch-dedup-check.js`로 실행한다. 이번엔 `ZODIAC_DATA.filter(z => typeof z.trait === 'object')` 조건에 12개 궁 전부가 걸리므로 전체가 검사 대상이다(advice↔b풀 echo 축도 12개 궁 전부에 대해 실행됨). `Found 0 issues`가 나올 때까지 새로 쓴 6개 궁의 변형 문장을 수정한다(Task 1에서 이미 검증된 6개 궁은 수정하지 않는다 — 만약 그쪽에서 충돌이 뜬다면 새로 쓴 6개 궁 문장을 바꿔서 해결한다). 통과 후 `scratch-dedup-check.js` 삭제(커밋하지 않음).

- [ ] **Step 3: 구조 확인**

12개 궁 전체를 Read 도구로 다시 읽어 다음을 확인한다: 모든 궁에서 `trait`/19개 카테고리 필드가 `a`/`b` 각 3개 배열인지, `keywords` 6개, `advice` 3개, 기존 인덱스 0 문장이 원본과 동일한지.

- [ ] **Step 4: 커밋**

```bash
git add data/zodiac-data.js
git commit -m "content(zodiac): convert libra/scorpio/sagittarius/capricorn/aquarius/pisces to a/b pool structure for random readings"
```

---

## Task 3: 영구 회귀 테스트 재작성 (`tests/zodiac-data.test.js`)

**Files:**
- Modify: `tests/zodiac-data.test.js`

**Interfaces:**
- Consumes: Task 1+2가 완성한 `ZODIAC_DATA`의 `{a,b}`/풀 구조, `tests/helpers/dedup.js`의 기존 export(신규 함수 불필요)
- Produces: 없음(테스트 파일)

기존 `tests/zodiac-data.test.js`는 구 구조(문자열 필드) 기준이라 전체를 새 구조 기준으로 다시 쓴다.

- [ ] **Step 1: 파일 전체를 다음으로 교체**

```javascript
const assert = require('assert');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const EXPECTED_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
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

function getField(z, cat, sub) {
  return sub ? z.categories[cat][sub] : z.categories[cat];
}

function allFieldsOf(z) {
  return [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));
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

assert.strictEqual(ZODIAC_DATA.length, 12, '별자리는 12개여야 함');
assert.deepStrictEqual(ZODIAC_DATA.map(d => d.key), EXPECTED_KEYS, '양자리~물고기자리 순서와 key가 일치해야 함');

ZODIAC_DATA.forEach(function (z) {
  assertPool(z.trait, z.key + '.trait');

  assert.ok(Array.isArray(z.keywords) && z.keywords.length === 6,
    z.key + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(z.keywords).size, 6, z.key + ' keywords must all be distinct');

  assert.ok(Array.isArray(z.advice) && z.advice.length === 3,
    z.key + ' advice must be an array of exactly 3 items');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (sub) {
      assertPool(getField(z, cat, sub), z.key + '.categories.' + cat + '.' + sub);
    });
  });
  SINGLE_CATEGORIES.forEach(function (cat) {
    assertPool(getField(z, cat, null), z.key + '.categories.' + cat);
  });
});

console.log('All 12 zodiac signs have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

// ---------------------------------------------------------------------------
// 중복 검사 — 네 축: (1) 필드 내부 자기중복, (2) advice 풀 자기중복,
// (3) advice ↔ 모든 b풀 echo(신규), (4) 금지쌍(a는 3단 결합, b는 단순)
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
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const issues = fullCombinedIssues(pool[i], pool[j], z.keywords);
          if (issues.length) {
            withinFieldCollisions.push(z.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
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
ZODIAC_DATA.forEach(function (z) {
  for (let i = 0; i < z.advice.length; i++) {
    for (let j = i + 1; j < z.advice.length; j++) {
      const wj = wordJaccard(z.advice[i], z.advice[j]);
      if (wj >= WORD_TH) {
        adviceCollisions.push(z.name_kr + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + z.advice[i] + '\n  ' + z.advice[j]);
      }
    }
  }
});

assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));

console.log('No advice-pool self-collisions (each sign\'s 3 advice variants are sufficiently distinct)');

const adviceEchoCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    field.b.forEach(function (sB, j) {
      z.advice.forEach(function (adv, i) {
        const wj = wordJaccard(adv, sB);
        if (wj >= WORD_TH) {
          adviceEchoCollisions.push(z.name_kr + ' advice[' + i + '] <-> ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + adv + '\n  ' + sB);
        }
      });
    });
  });
});

assert.strictEqual(adviceEchoCollisions.length, 0,
  'Found ' + adviceEchoCollisions.length + ' advice<->b-pool render-together echo collisions:\n' + adviceEchoCollisions.join('\n'));

console.log('No advice<->b-pool render-together echo collisions (advice and trait/category b-pools never share a skeleton)');

const forbiddenACollisions = [];
const forbiddenBCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const fA = getField(z, catA, subA), fB = getField(z, catB, subB);
        fA.a.forEach(function (sA, i) {
          fB.a.forEach(function (sB, j) {
            const issues = fullCombinedIssues(sA, sB, z.keywords);
            if (issues.length) {
              forbiddenACollisions.push(z.name_kr + ' ' + catA + '.' + subA + '.a' + i + ' <-> ' + catB + '.' + subB + '.a' + j + ' (' + issues.join(' | ') + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
        fA.b.forEach(function (sA, i) {
          fB.b.forEach(function (sB, j) {
            const wj = wordJaccard(sA, sB);
            if (wj >= WORD_TH) {
              forbiddenBCollisions.push(z.name_kr + ' ' + catA + '.' + subA + '.b' + i + ' <-> ' + catB + '.' + subB + '.b' + j + ' (word=' + wj.toFixed(2) + ')\n  ' + sA + '\n  ' + sB);
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

console.log('All zodiac-data tests passed');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/zodiac-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 실패하면 Task 1/2로 돌아가 해당 필드(항상 인덱스 1 또는 2)를 수정한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add tests/zodiac-data.test.js
git commit -m "test(zodiac): rewrite structure and 4-axis dedup regression tests for a/b pool structure"
```

---

## Task 4: 브라우저 확인 (5개 모드 전부)

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~3의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node scripts/run-tests.js`
Expected: 10개 테스트 파일 전부 통과.

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. **별자리(신규 랜덤화) — 같은 선택 반복**: 별자리 모드 → 임의 별자리 선택 → "연애운" → "솔로" 선택 후 리딩 실행. 결과 화면의 해설 문장·키워드·조언을 기록해둔다.
2. "새로운 리딩" 버튼으로 돌아가 **정확히 같은 선택**으로 5~6회 반복 실행한다. 매번 해설 문장이나 키워드 조합, 조언 중 최소 하나는 이전과 달라지는지 확인한다.
3. 매번 나오는 해설이 문맥상 자연스러운지 확인한다.
4. "명예운"(단일 카테고리)도 반복 실행해 문장이 달라지는지 확인한다.
5. "오늘의운"(카테고리 미선택, `trait`+`advice` 함께 렌더)도 반복 실행해 문장이 달라지고, `trait`와 `advice`가 같은 화면에서 어색하게 겹치지 않는지 특히 확인한다(이번 단계에서 새로 추가한 echo 검사축이 실제로 커버하는 지점).
6. **회귀 — 타로**: 타로 모드로 카드 뽑기 → 정/역방향 해설과 키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
7. **회귀 — 사주**: 사주 모드로 리딩 실행 → 명식표·오행 균형 문장·카테고리 해설·키워드/조언이 기존과 동일하게 나오는지 확인.
8. **회귀 — 띠운세**: 띠운세 모드로 리딩 실행 → 이전 단계(랜덤화 적용됨)와 동일하게 반복 시 결과가 달라지는지 재확인(별자리 작업 중 실수로 영향받지 않았는지).
9. **회귀 — 궁합**: 궁합 모드로 리딩 실행 → 점수·해설·키워드/조언이 기존과 동일하게 나오는지 확인.
10. "지난 기록"을 열어 방금 만든 별자리 리딩들이 정상적으로 표시되는지 확인.
11. 콘솔에 에러가 없는지 확인.

Expected: 별자리(1~5)는 반복 시 결과가 달라지고 문맥이 자연스러움, 타로/사주(6~7)는 고정 문구 그대로, 띠운세(8)는 계속 랜덤화 동작, 궁합(9)은 고정 문구 그대로, 10~11 정상.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인**

이 태스크는 검증 전용이라 기본적으로 커밋이 없다. Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(zodiac): ...` 커밋을 추가한다.
