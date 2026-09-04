# 리딩 랜덤화 — 사주 단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/saju-data.js`의 10개 일간(`ILGAN_DATA`) `trait`/카테고리 본문을 "관찰절(A)+조언절(B)" 슬롯 배열(`{a:[...3], b:[...3]}`)로, `keywords`(3→6)/`advice`(1→3)를 풀로 확장해 사주 리딩이 매번 랜덤하게 달라지도록 만든다. 띠운세·별자리에서 검증한 방식을 그대로 이식하며, `js/app.js`는 전혀 건드리지 않는다.

**Architecture:** 데이터 스키마·렌더링 방식은 이전 두 단계와 동일. Dedup 검사는 별자리 최종 리뷰의 교훈을 반영해 6개 축으로 확장한다(강화된 echo 지표, 엔티티 간 완전동일 검사, 같은 엔티티 내 근접축자 검사 추가). 사주 특유의 `ELEMENT_BALANCE_TEXT`(오행 13개 고정 문구)는 랜덤화하지 않지만 echo 검사 비교 대상에 포함한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음). Node `assert` 기반 테스트, `tests/helpers/dedup.js`의 기존 공유 함수 재사용(신규 export 불필요).

## Global Constraints

- 대상은 `data/saju-data.js`(`ILGAN_DATA` 10개 일간) 하나뿐이다. `js/app.js`, 다른 모드의 데이터 파일은 전혀 수정하지 않는다 — `resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()`가 이미 문자열/`{a,b}` 객체, 고정 배열/풀 배열 양쪽을 모두 처리한다(`js/app.js:279-327`, 별자리 단계에서 검증됨).
- 각 필드(카테고리 본문 19개 + `trait` 1개, 일간당 20개)의 **기존 값이 새 배열의 인덱스 0(`a[0]`/`b[0]`)이 되어야 하며, 절대 수정하지 않는다.** 이 인덱스 0 값은 이전 사주 콘텐츠 확장 프로젝트(2026-08-20)에서 이미 확정·배포된 문장이다.
- 신규 변형은 슬롯당 2개씩 추가해 풀 크기를 3으로 만든다(`a`/`b` 각 정확히 3개).
- `keywords`는 3개(기존, 순서 유지) + 3개(신규, 뒤에 추가) = 정확히 6개 배열(distinct). `advice`는 기존 문자열이 인덱스 0이 되고 신규 2개를 추가해 정확히 3개 배열.
- `ELEMENT_BALANCE_TEXT`(오행 과다 5개 + 부족 5개 + 균형 1개 = 13개 고정 문구), `key`/`name_kr`/`element` 등 랜덤화와 무관한 필드는 변경하지 않는다.
- **잠긴 참조**: `key: 'gap'`(갑목) — 아래 Task 1 Step 1에 실제 dedup 알고리즘(6개 축 전부)으로 검증(0건 확인됨)까지 마친 최종 콘텐츠가 그대로 제공되어 있다. **이 블록은 절대 수정하지 않는다.**
- 세분화 카테고리·서브키, 금지쌍은 기존과 완전히 동일: `love`(solo/couple)↔`relationships`(new/existing), `career`(jobseek/switch)↔`workplace`(team/personal), `money`(consumption/invest)↔`business`(startup/running). 단일 카테고리는 `honor`/`moving`/`children`.
- **중복검사는 6개 축**(전부 아래 Task 1 Step 3의 스윕 스크립트, Task 3의 영구 테스트에 동일하게 구현한다):
  1. **필드 내부 자기중복**: 같은 필드의 `a`풀 3개끼리, `b`풀 3개끼리 각각 3단 결합(word-Jaccard≥0.3 전체 스윕 + word≥0.20∧trigram≥0.15 결합 + LCS≥5∨어근중복≥2∨bigram≥0.185 결합, 상투구·자기 keywords 제거 후).
  2. **advice 풀 자기중복**: 일간당 advice 3개끼리 word-Jaccard≥0.3 단순 스윕.
  3. **advice↔b풀·오행문구 echo(강화)**: 모든 `advice[i]`를 그 일간의 모든 필드 `b[j]`(19개 카테고리 `b`풀 + `trait.b`) 및 `ELEMENT_BALANCE_TEXT` 13개 문구 전체와 비교. 판정: `word-Jaccard≥0.3 OR bigram≥0.30 OR LCS≥10`(비교 전 양쪽 모두 상투구 제거 — LCS/bigram 계산에 "~것이 좋습니다"/"~해보세요" 같은 흔한 종결구가 섞이면 오탐이 나므로 필수). **인덱스 0(잠긴 문장)끼리 비교, 또는 인덱스 0과 `ELEMENT_BALANCE_TEXT`(항상 고정) 비교는 스킵한다** — 둘 다 수정 불가능한 콘텐츠라 충돌이 나와도 고칠 수 없기 때문(갑목 검증 중 실제로 발견됨).
  4. **금지쌍(cross-category) 교차**: `a`풀은 3단 결합 전체(3×3 전수), `b`풀은 word-Jaccard≥0.3 단순 스윕만(이유: `b[0]`끼리는 이미 잠긴 문장이라 3단 결합 적용 시 수정 불가능한 충돌 발생 가능 — 띠운세에서 확인됨). **`a`풀 비교도 양쪽 다 인덱스 0인 경우는 스킵한다**(갑목 검증 중 `love.couple.a0`↔`relationships.new.a0` 충돌이 실제로 발견되었고 둘 다 수정 불가능한 잠긴 문장이었음 — 이 스킵 규칙은 spec에는 명시되지 않았으나 검증 과정에서 필요성이 확인되어 이 플랜에서 추가함).
  5. **일간 간 완전동일 검사**: 전체 코퍼스(10개 일간 × 20필드 × a/b 각 3개 = 1,200개 문장)를 하나의 리스트로 모아 바이트 단위 완전 동일 문자열이 2개 이상이면 플래그(단순 카운트, 3단 결합 불필요).
  6. **같은 일간 내 비금지쌍 근접축자 검사**: 같은 일간의 20개 필드(trait+19) 전체 쌍(190쌍)에 대해 `a`풀-`a`풀, `b`풀-`b`풀 조합에 LCS≥20만 적용(상투구 제거 후). 금지쌍(축 4에서 이미 커버)은 제외. **양쪽 다 인덱스 0인 경우는 스킵한다**(갑목 검증 중 3건 발견, 전부 이미 배포된 문장끼리의 우연한 겹침이라 수정 불가능했음).
- `data/saju-data.js`는 기존에 작은따옴표(`'...'`) 스타일을 쓴다(다른 4개 데이터 파일과 다름 — 반드시 이 파일의 기존 스타일을 따른다).
- `tests/zodiac-data.test.js`/`tests/ddi-data.test.js`와의 공유 dedup 헬퍼 추출은 이번 단계에서 하지 않는다(사용자 확인 완료, 궁합 단계에서 재검토).

---

## Task 1: `data/saju-data.js` 콘텐츠 변환 — Part A (갑목[잠긴 참조] + 4개 일간)

**Files:**
- Modify: `data/saju-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `ILGAN_DATA[0..4]`(gap, eul, byeong, jeong, mu)의 `trait`/`categories.*`가 `{a:[...3], b:[...3]}` 구조로, `keywords`가 6개 배열로, `advice`가 3개 배열로 변경됨. Task 2가 나머지 5개 일간에 동일 구조를 적용하고, Task 3(테스트)이 이 새 구조를 전제로 동작한다.

- [ ] **Step 1: "갑목" 항목을 아래 잠긴 참조 콘텐츠로 정확히 교체**

`data/saju-data.js`의 첫 번째 `ILGAN_DATA` 항목(`key: 'gap'`, 현재 2~44행)을 다음으로 통째로 교체한다. **이 콘텐츠는 이미 실제 dedup 스윕 스크립트(6개 축 전부, 위 Global Constraints의 스킵 규칙 포함)로 검증되어 충돌 0건임이 확인되었다 — 한 글자도 수정하지 않는다.** 이 파일은 작은따옴표 스타일을 쓴다.

```js
  {
    key: 'gap', name_kr: '갑목', element: '목',
    trait: {
      a: [
        '큰 나무처럼 곧고 정직한 갑목은 타고난 리더십으로 주변을 이끕니다.',
        '뿌리 깊은 나무처럼 한번 정한 뜻을 굽히지 않는 강단이 있습니다.',
        '앞장서서 방향을 제시하는 자리가 유독 잘 어울립니다.'
      ],
      b: [
        '다만 융통성을 조금 더하면 관계가 한결 부드러워집니다.',
        '그 강단에 배려를 얹으면 곁을 지키는 사람이 늘어납니다.',
        '곧은 성정 아래 숨은 배려심을 가끔 내비치면 신뢰가 두터워집니다.'
      ]
    },
    keywords: ['곧은 신념', '타고난 리더십', '정직한 추진력', '책임감', '일관성', '우직함'],
    advice: [
      '확신이 설수록 주변의 다른 의견에도 한 번 더 귀 기울여보세요.',
      '원칙을 지키는 것만큼 상대의 처지를 헤아리는 마음도 함께 키워보세요.',
      '곧은 걸음에 유연한 마디를 더하면 어디서든 더 오래 뻗어나갈 수 있어요.'
    ],
    categories: {
      love: {
        solo: {
          a: [
            '직진하는 매력으로 상대의 마음을 단숨에 사로잡는 시기입니다.',
            '관심이 생기면 에두르지 않고 곧바로 다가서는 시기입니다.',
            '속마음을 감추지 않는 성격이 자연스럽게 호감으로 이어지는 시기입니다.'
          ],
          b: [
            '돌려 말하지 않는 솔직한 고백이 오히려 좋은 인상을 남길 수 있어요.',
            '속도를 조절하며 상대가 부담을 느끼지 않는지 살펴보세요.',
            '직진하는 태도만큼 상대의 반응에도 귀 기울여보세요.'
          ]
        },
        couple: {
          a: [
            '곧은 마음으로 연인에게 흔들림 없는 믿음을 주는 시기입니다.',
            '약속한 것은 반드시 지키는 태도로 연인을 안심시키는 시기입니다.',
            '우직하게 한 사람만 바라보는 진심이 관계를 지켜주는 시기입니다.'
          ],
          b: [
            '때로는 상대의 속도에 맞춰 한 박자 늦추는 여유가 관계를 더 단단하게 만들어줍니다.',
            '가끔은 계획에 없던 이벤트로 관계에 활력을 더해보세요.',
            '일방적으로 이끌기보다 연인의 의견도 먼저 물어보세요.'
          ]
        }
      },
      money: {
        consumption: {
          a: [
            '정직하고 계획적인 소비 습관이 재정에 안정을 더하는 시기입니다.',
            '필요한 것과 원하는 것을 뚜렷이 구분해 지출하는 시기입니다.',
            '세운 원칙대로 씀씀이를 지켜나가는 모습이 돋보이는 시기입니다.'
          ],
          b: [
            '충동구매보다 원칙을 세워두고 지키는 편이 훨씬 잘 맞습니다.',
            '가끔은 계획에 없던 작은 사치도 스스로에게 허락해보세요.',
            '원칙이 너무 엄격해 삶의 여유를 놓치지 않도록 하세요.'
          ]
        },
        invest: {
          a: [
            '확신이 선 곳에는 과감하게 움직이는 결단력이 좋은 결과로 이어지는 시기입니다.',
            '분석을 마치면 망설임 없이 자금을 움직이는 시기입니다.',
            '한번 세운 투자 원칙을 끝까지 지켜나가는 시기입니다.'
          ],
          b: [
            '결단을 내리기 전 충분한 정보부터 확인해두면 더 큰 확신으로 이어집니다.',
            '확신이 강할수록 손실 가능성도 냉정하게 따져보세요.',
            '원칙을 지키되 시장의 변화에도 눈을 열어두세요.'
          ]
        }
      },
      career: {
        jobseek: {
          a: [
            '곧은 신념으로 원하는 자리를 향해 흔들림 없이 나아가는 시기입니다.',
            '이력서 한 줄까지 명확하게 자신을 드러내는 시기입니다.',
            '기준에 맞지 않는 곳은 과감히 걸러내고 지원하는 시기입니다.'
          ],
          b: [
            '면접에서도 솔직하고 명확한 태도가 오히려 좋은 인상을 남길 수 있어요.',
            '지나치게 딱딱해 보이지 않도록 미소 짓는 연습도 해보세요.',
            '솔직함이 지나쳐 무뚝뚝하게 비치지 않도록 표정도 신경 써보세요.'
          ]
        },
        switch: {
          a: [
            '지금의 방향에 확신이 서면 과감하게 결단을 내리는 시기입니다.',
            '결심이 서면 뒤돌아보지 않고 이직을 추진하는 시기입니다.',
            '지금 자리의 한계를 명확히 인식하고 새 길을 찾는 시기입니다.'
          ],
          b: [
            '다만 감정에 휩쓸린 결정은 아닌지 한 번 더 점검해보는 것이 좋습니다.',
            '결심을 굳히기 전 주변의 조언도 한 번 들어보세요.',
            '떠나기로 했다면 마무리도 깔끔하게 정리해보세요.'
          ]
        }
      },
      workplace: {
        team: {
          a: [
            '책임감 있는 태도로 팀 안에서 신뢰를 얻는 시기입니다.',
            '정한 원칙을 지키며 팀에 안정감을 주는 시기입니다.',
            '맡은 몫을 묵묵히 해내며 동료들 사이에서 존재감을 쌓는 시기입니다.'
          ],
          b: [
            '자신의 방식을 밀어붙이기 전에 팀원들의 의견부터 들어보면 더 좋은 결과로 이어집니다.',
            '때로는 정해진 틀을 벗어난 아이디어도 받아들여보세요.',
            '혼자 짊어지기보다 팀원들과 부담을 나눠보세요.'
          ]
        },
        personal: {
          a: [
            '맡은 일을 끝까지 밀고 나가는 뚝심으로 성과를 인정받는 시기입니다.',
            '손댄 업무는 반드시 마무리 짓는 성실함이 돋보이는 시기입니다.',
            '손에 익은 방식을 벗어나지 않고 꾸준히 마무리해가는 시기입니다.'
          ],
          b: [
            '완벽을 추구하다 지치지 않도록 스스로 속도를 조절하는 지혜도 필요합니다.',
            '가끔은 새로운 방법도 시도해보는 유연함이 필요합니다.',
            '완벽을 고집하기보다 적당한 선에서 마무리해도 괜찮습니다.'
          ]
        }
      },
      business: {
        startup: {
          a: [
            '확고한 원칙이 사업의 기반을 단단히 다지는 시기입니다.',
            '타협하지 않는 기준 하나로 신뢰의 첫 단추를 꿰는 시기입니다.',
            '정직한 태도 하나로 첫 고객의 마음을 사로잡는 시기입니다.'
          ],
          b: [
            '혼자 모든 걸 결정하기보다 신뢰할 수 있는 조언자를 곁에 두면 훨씬 든든합니다.',
            '원칙만 고집하다 협상의 여지를 잃지 않도록 하세요.',
            '혼자 판단하기보다 믿을 만한 사람과 상의해보세요.'
          ]
        },
        running: {
          a: [
            '흔들림 없는 뚝심으로 사업을 안정적으로 이끌어가는 시기입니다.',
            '우직하게 버텨온 시간이 지금의 기반을 지켜주는 시기입니다.',
            '원칙 있는 운영으로 거래처의 신뢰를 다지는 시기입니다.'
          ],
          b: [
            '다만 시장의 변화 앞에서는 조금 더 유연하게 대응해보세요.',
            '정해진 방식만 고집하다 변화에 뒤처지지 않도록 하세요.',
            '가끔은 낯선 시도도 받아들이는 유연함이 필요합니다.'
          ]
        }
      },
      study: {
        exam: {
          a: [
            '목표를 세우면 흔들림 없이 밀고 나가는 집중력이 좋은 결과로 이어지는 시기입니다.',
            '한번 정한 학습량은 끝까지 채워내는 끈기가 돋보이는 시기입니다.',
            '잡생각 없이 책상 앞을 지키는 시간이 실력으로 쌓이는 시기입니다.'
          ],
          b: [
            '계획한 진도를 꾸준히 지켜나가는 것이 무엇보다 중요합니다.',
            '계획이 틀어졌을 때는 유연하게 다시 조정해보세요.',
            '가끔은 다른 방법도 시도해보는 여유를 가져보세요.'
          ]
        },
        path: {
          a: [
            '한번 정한 방향은 곧게 밀고 나가는 결단력이 빛을 발하는 시기입니다.',
            '고민 끝에 내린 결론은 뒤돌아보지 않는 시기입니다.',
            '확고한 목표의식이 진로 결정을 앞당기는 시기입니다.'
          ],
          b: [
            '그만큼 다른 가능성도 가끔은 열어두면 더 좋은 선택으로 이어질 수 있어요.',
            '주변에서 건네는 조언도 한 번씩 새겨들으면 도움이 됩니다.',
            '확신이 서지 않을 땐 작은 시도부터 해보는 것도 좋습니다.'
          ]
        }
      },
      health: {
        body: {
          a: [
            '넘치는 활력으로 활기차게 지낼 수 있는 시기입니다.',
            '타고난 체력으로 웬만한 무리에도 잘 버티는 시기입니다.',
            '곧은 자세와 꾸준한 활동이 컨디션을 지켜주는 시기입니다.'
          ],
          b: [
            '몸이 보내는 신호를 놓치지 않아야 과로로 이어지지 않습니다.',
            '몸의 신호를 무시하고 밀어붙이지 않도록 조심하세요.',
            '쉬어야 할 때는 미련 없이 쉬어가는 것도 필요합니다.'
          ]
        },
        mind: {
          a: [
            '확고한 마음가짐이 웬만한 스트레스에도 잘 버티게 해주는 시기입니다.',
            '한번 다잡은 마음은 웬만해선 흐트러지지 않는 시기입니다.',
            '단단한 배짱이 어지간한 압박에도 끄떡없게 지켜주는 시기입니다.'
          ],
          b: [
            '가끔은 고집을 내려놓고 마음을 풀어주는 시간도 필요합니다.',
            '때로는 다른 사람의 위로를 있는 그대로 받아들여보세요.',
            '답답할 땐 잠시 걸으며 생각을 환기해보는 것도 좋습니다.'
          ]
        }
      },
      relationships: {
        new: {
          a: [
            '솔직하고 곧은 태도로 새로운 인연에게 신뢰를 주는 시기입니다.',
            '숨김없는 언행이 낯선 사람과의 거리도 금세 좁혀주는 시기입니다.',
            '말과 행동이 일치하는 모습이 좋은 인상을 남기는 시기입니다.'
          ],
          b: [
            '꾸미지 않은 모습 그대로 다가가는 것이 오히려 매력으로 다가갈 수 있어요.',
            '너무 직설적인 표현이 부담스럽지 않은지 살펴보세요.',
            '천천히 다가가는 여유도 가끔은 필요합니다.'
          ]
        },
        existing: {
          a: [
            '한결같은 믿음으로 관계를 든든하게 지켜가는 시기입니다.',
            '한번 맺은 인연을 끝까지 책임지는 태도가 돋보이는 시기입니다.',
            '변함없는 태도로 오랜 관계에 안정감을 주는 시기입니다.'
          ],
          b: [
            '자신의 기준만 고집하지 않고 상대의 입장도 헤아려보면 관계가 한결 편안해집니다.',
            '가끔은 상대의 방식에도 맞춰주는 유연함이 필요합니다.',
            '자신의 방식만 옳다고 여기지 않도록 열린 마음을 가져보세요.'
          ]
        }
      },
      honor: {
        a: [
          '곧은 행보로 주변의 인정을 받는 시기입니다.',
          '타협 없는 원칙이 시간이 지나며 신뢰로 쌓이는 시기입니다.',
          '말수는 적어도 행동이 쌓여 결국 인정받는 시기입니다.'
        ],
        b: [
          '원칙을 지키는 모습이 시간이 지날수록 더 큰 신뢰로 돌아옵니다.',
          '완고해 보이지 않도록 부드러운 태도도 함께 보여주세요.',
          '인정받는 순간에도 겸손함을 잃지 않도록 하세요.'
        ]
      },
      moving: {
        a: [
          '확신이 서면 망설임 없이 움직이는 결단력이 빛을 발하는 시기입니다.',
          '조건이 확실해지면 곧바로 결정을 내리는 시기입니다.',
          '원칙에 맞는 곳을 찾으면 망설이지 않고 움직이는 시기입니다.'
        ],
        b: [
          '성급하게 결정하기 전에 조건을 한 번 더 확인해보면 후회를 줄일 수 있습니다.',
          '속도만 앞세우다 놓친 부분은 없는지 다시 살펴보세요.',
          '곁에서 지켜본 사람의 시선도 한 번쯤 들어보면 좋습니다.'
        ]
      },
      children: {
        a: [
          '든든한 울타리가 되어 아이를 지지해주는 시기입니다.',
          '흔들림 없는 원칙으로 자녀에게 안정적인 기준을 세워주는 시기입니다.',
          '말보다 행동이 앞서는 모습을 자녀가 먼저 알아채는 시기입니다.'
        ],
        b: [
          '지나치게 엄격한 기준을 강요하지 않도록 유의하는 것이 좋습니다.',
          '원칙이 너무 엄격하면 아이가 부담을 느낄 수 있으니 조절하세요.',
          '가끔은 아이의 뜻대로 하게 두는 여유도 필요합니다.'
        ]
      }
    }
  },
```

- [ ] **Step 2: 나머지 4개 일간(을목, 병화, 정화, 무토)에 같은 패턴 적용**

각 일간에 대해:

1. 기존 `trait`(두 문장)를 `{ a: [문장1], b: [문장2] }`로 나눈다. 기존 `categories`의 19개 필드도 각각 기존 첫 문장→`a[0]`, 기존 둘째(또는 셋째) 문장→`b[0]`으로 나눈다. 문장이 3개인 필드는 첫 문장을 `a[0]`, 나머지 문장 전체(공백으로 이어붙임)를 `b[0]`으로 취급한다. `element`는 그대로 둔다.
2. `a[1]`/`a[2]`(관찰절 변형 2개)와 `b[1]`/`b[2]`(조언절 변형 2개)를 새로 쓴다. **주어/문장 구조 자체를 바꿔서 변형하라** — 그 일간의 핵심 어휘(예: 갑목의 "곧은/흔들림 없이/원칙/확신")를 여러 필드·같은 필드 안에서 그대로 반복하면 실제로 충돌한다(갑목 잠긴 참조 작성 중 22건이 이렇게 걸려 전부 재작성했다). **새 변형을 쓸 때마다 그 문장이 같은 일간의 다른 필드에서 이미 쓴 표현과 겹치지 않는지 계속 대조하라** — 특히 비슷한 톤의 필드(예: business.startup과 business.running, career.jobseek과 workplace.personal)에서 같은 어휘를 재사용하기 쉽다.
3. `keywords`에 그 일간의 성격을 반영한 신규 3개를 기존 3개 뒤에 추가한다(총 6개, 기존과 겹치지 않게).
4. `advice`에 신규 2개를 기존 1개(이제 인덱스 0) 뒤에 추가한다(총 3개). **advice는 `trait.b`·모든 카테고리 `b`풀·`ELEMENT_BALANCE_TEXT` 13개 고정 문구와 같은 화면에 나란히 렌더될 수 있으므로, 새로 쓰는 advice 변형이 이들과 문장 뼈대를 공유하지 않는지 특히 신경 써서 작성한다.** `ELEMENT_BALANCE_TEXT`는 `data/saju-data.js`의 434~450행에 있다 — 미리 한 번 읽어두고 advice/b풀 작성 시 참고한다.
5. 문자열은 기존 파일 스타일대로 작은따옴표(`'...'`)를 사용한다.

- [ ] **Step 3: 스윕 스크립트 작성**

프로젝트 루트에 임시 파일 `scratch-dedup-check.js`(작업 완료 후 삭제, 커밋하지 않음)로 저장하고 `node scratch-dedup-check.js`로 실행한다. Global Constraints의 6개 축(스킵 규칙 포함)을 그대로 구현한다:

```javascript
const { ILGAN_DATA, ELEMENT_BALANCE_TEXT } = require('./data/saju-data.js');
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
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10;
const NEARVERBATIM_LCS_TH = 20;

function stripForEcho(s) {
  return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
}

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
    issues.push('lcs=' + lcs + ' stems=' + shared.join(','));
  }
  if (issues.length) { console.log('[' + label + '] ' + issues.join(' | ') + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}

function simpleWordCheck(s1, s2, label) {
  const wj = wordJaccard(s1, s2);
  if (wj >= WORD_TH) { console.log('[' + label + '] word=' + wj.toFixed(2) + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}

function echoCheck(s1, s2, label) {
  const wj = wordJaccard(s1, s2);
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const bj = bigramJaccard(t1, t2);
  const lcs = longestCommonSubstring(t1, t2);
  if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) {
    console.log('[' + label + '] word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs + '\n  ' + s1 + '\n  ' + s2);
    return true;
  }
  return false;
}

function nearVerbatimCheck(s1, s2, label) {
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const lcs = longestCommonSubstring(t1, t2);
  if (lcs >= NEARVERBATIM_LCS_TH) {
    console.log('[' + label + '] lcs=' + lcs + '\n  ' + s1 + '\n  ' + s2);
    return true;
  }
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

function getField(ilgan, cat, sub) {
  return sub ? ilgan.categories[cat][sub] : ilgan.categories[cat];
}
function allFieldsOf() {
  return [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).flatMap(cat => SUBDIVIDED_CATEGORIES[cat].map(sub => [cat, sub])))
    .concat(SINGLE_CATEGORIES.map(cat => [cat, null]));
}
const FORBIDDEN_FIELD_SET = new Set();
FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
  subsA.forEach(subA => subsB.forEach(subB => {
    const f1 = catA + (subA ? '.' + subA : ''), f2 = catB + (subB ? '.' + subB : '');
    FORBIDDEN_FIELD_SET.add(f1 + '|' + f2);
    FORBIDDEN_FIELD_SET.add(f2 + '|' + f1);
  }));
});

const BALANCE_TEXTS = Object.values(ELEMENT_BALANCE_TEXT.excess)
  .concat(Object.values(ELEMENT_BALANCE_TEXT.deficient))
  .concat([ELEMENT_BALANCE_TEXT.balanced]);

let found = 0;
const allSentences = []; // for axis 5: cross-entity exact-match

// 지금까지 작성된 일간만 검사 대상(갑목 포함, 아직 문자열인 미작성 일간은 건너뜀)
ILGAN_DATA.filter(ilgan => typeof ilgan.trait === 'object').forEach(ilgan => {
  const fields = allFieldsOf();

  // axis 1: 필드 내부 자기중복 (a/b 모두 3단 결합)
  fields.forEach(([cat, sub]) => {
    const field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    ['a', 'b'].forEach(slot => {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          if (fullCombinedCheck(pool[i], pool[j], ilgan.keywords, ilgan.name_kr + ' AXIS1 ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + ']')) found++;
        }
      }
      pool.forEach(s => allSentences.push({ text: s, where: ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot }));
    });
  });

  // axis 2: advice 풀 자기중복
  for (let i = 0; i < ilgan.advice.length; i++) {
    for (let j = i + 1; j < ilgan.advice.length; j++) {
      if (simpleWordCheck(ilgan.advice[i], ilgan.advice[j], ilgan.name_kr + ' AXIS2 ADVICE[' + i + ',' + j + ']')) found++;
    }
  }

  // axis 3: advice <-> 모든 b풀 + ELEMENT_BALANCE_TEXT (echo, 강화 지표, 잠긴-잠긴 스킵)
  fields.forEach(([cat, sub]) => {
    const field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    field.b.forEach((sB, j) => {
      ilgan.advice.forEach((adv, i) => {
        if (i === 0 && j === 0) return;
        if (echoCheck(adv, sB, ilgan.name_kr + ' AXIS3 advice[' + i + '] vs ' + cat + (sub ? '.' + sub : '') + '.b[' + j + ']')) found++;
      });
    });
  });
  ilgan.advice.forEach((adv, i) => {
    if (i === 0) return;
    BALANCE_TEXTS.forEach((bt, k) => {
      if (echoCheck(adv, bt, ilgan.name_kr + ' AXIS3-BAL advice[' + i + '] vs balance[' + k + ']')) found++;
    });
  });
  fields.forEach(([cat, sub]) => {
    const field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    field.b.forEach((sB, j) => {
      if (j === 0) return;
      BALANCE_TEXTS.forEach((bt, k) => {
        if (echoCheck(sB, bt, ilgan.name_kr + ' AXIS3-BAL ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] vs balance[' + k + ']')) found++;
      });
    });
  });

  // axis 4: 금지쌍 (a는 3단 결합, 잠긴-잠긴 스킵 / b는 단순)
  FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
    subsA.forEach(subA => subsB.forEach(subB => {
      const fA = getField(ilgan, catA, subA), fB = getField(ilgan, catB, subB);
      fA.a.forEach((sA, i) => fB.a.forEach((sB, j) => {
        if (i === 0 && j === 0) return;
        if (fullCombinedCheck(sA, sB, ilgan.keywords, ilgan.name_kr + ' AXIS4-A ' + catA + '.' + subA + '.a' + i + ' vs ' + catB + '.' + subB + '.a' + j)) found++;
      }));
      fA.b.forEach((sA, i) => fB.b.forEach((sB, j) => {
        if (simpleWordCheck(sA, sB, ilgan.name_kr + ' AXIS4-B ' + catA + '.' + subA + '.b' + i + ' vs ' + catB + '.' + subB + '.b' + j)) found++;
      }));
    }));
  });

  // axis 6: 같은 일간 내 비금지쌍 근접축자 (LCS>=20, 잠긴-잠긴 스킵)
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const [cat1, sub1] = fields[i], [cat2, sub2] = fields[j];
      const f1name = cat1 + (sub1 ? '.' + sub1 : ''), f2name = cat2 + (sub2 ? '.' + sub2 : '');
      if (FORBIDDEN_FIELD_SET.has(f1name + '|' + f2name)) continue;
      const F1 = cat1 === 'trait' ? ilgan.trait : getField(ilgan, cat1, sub1);
      const F2 = cat2 === 'trait' ? ilgan.trait : getField(ilgan, cat2, sub2);
      ['a', 'b'].forEach(slot => {
        F1[slot].forEach((s1, x) => F2[slot].forEach((s2, y) => {
          if (x === 0 && y === 0) return;
          if (nearVerbatimCheck(s1, s2, ilgan.name_kr + ' AXIS6-' + slot.toUpperCase() + ' ' + f1name + '.' + slot + x + ' vs ' + f2name + '.' + slot + y)) found++;
        }));
      });
    }
  }
});

// axis 5: 일간 간 완전동일 검사 (전체 코퍼스, 바이트 단위)
const seen = new Map();
allSentences.forEach(({ text, where }) => {
  if (!seen.has(text)) seen.set(text, []);
  seen.get(text).push(where);
});
seen.forEach((locations, text) => {
  if (locations.length > 1) {
    found++;
    console.log('[AXIS5 EXACT-MATCH] "' + text + '" appears in: ' + locations.join(' | '));
  }
});

console.log('Found ' + found + ' issues');
```

`Found 0 issues`가 나올 때까지 충돌이 발견된 새 변형 문장(인덱스 1·2)을 수정하고 재실행한다. **인덱스 0(기존 문장)은 절대 수정하지 않는다.** 갑목은 이미 검증되었으므로 이 스크립트를 돌리면 갑목 관련 항목은 0건이어야 한다(0건이 아니면 Step 1의 붙여넣기 과정에서 오타가 생긴 것). **한 곳을 고치면 다른 곳과 새로 충돌할 수 있으니, 수정할 때마다 스크립트를 다시 돌려 전체가 0건인지 확인한다**(잠긴 참조 작성 중 실제로 여러 번 이런 연쇄 충돌이 발생했다). 통과 후 `scratch-dedup-check.js`는 삭제한다(커밋하지 않음).

- [ ] **Step 4: 구조 확인**

Read 도구로 방금 작성한 5개 일간(gap, eul, byeong, jeong, mu) 전체를 다시 읽어 다음을 육안으로 확인한다: `trait`/카테고리 19개 필드 전부 `a`/`b` 배열이 정확히 3개씩인지, `keywords`가 6개인지, `advice`가 3개인지, 기존 인덱스 0 문장이 원본과 바이트 단위로 동일한지, `element`가 그대로인지.

- [ ] **Step 5: 커밋**

```bash
git add data/saju-data.js
git commit -m "content(saju): convert gap/eul/byeong/jeong/mu to a/b pool structure for random readings"
```

---

## Task 2: `data/saju-data.js` 콘텐츠 변환 — Part B (나머지 5개 일간)

**Files:**
- Modify: `data/saju-data.js`

**Interfaces:**
- Consumes: Task 1이 만든 5개 일간의 `{a,b}` 구조(패턴 참고용), `scratch-dedup-check.js`와 동일한 스윕 로직
- Produces: `ILGAN_DATA[5..9]`(gi, gyeong, sin, im, gye)도 동일한 `{a,b}` 구조로 변경 — 이 태스크가 끝나면 `ILGAN_DATA` 10개 항목 전부가 새 구조를 갖는다.

- [ ] **Step 1: 나머지 5개 일간(기토, 경금, 신금, 임수, 계수)을 Task 1 Step 2와 동일한 방법으로 변환**

Task 1 Step 2의 1~5번 규칙을 그대로 적용한다. 갑목(잠긴 참조)과 Task 1에서 작성한 4개 일간의 최종 결과물을 스타일 참고용으로 사용한다.

- [ ] **Step 2: 스윕 스크립트 재실행 (전체 10개 일간 대상)**

Task 1 Step 3의 `scratch-dedup-check.js`를 다시 만들어(또는 파일이 남아있다면 재사용) `node scratch-dedup-check.js`로 실행한다. 이번엔 `ILGAN_DATA.filter(ilgan => typeof ilgan.trait === 'object')` 조건에 10개 일간 전부가 걸리므로 전체가 검사 대상이다(axis 5의 일간 간 완전동일 검사, axis 6의 근접축자 검사 모두 10개 일간 전체를 대상으로 실행됨). `Found 0 issues`가 나올 때까지 새로 쓴 5개 일간의 변형 문장을 수정한다(Task 1에서 이미 검증된 5개 일간은 수정하지 않는다). 통과 후 `scratch-dedup-check.js` 삭제(커밋하지 않음).

- [ ] **Step 3: 구조 확인**

10개 일간 전체를 Read 도구로 다시 읽어 다음을 확인한다: 모든 일간에서 `trait`/19개 카테고리 필드가 `a`/`b` 각 3개 배열인지, `keywords` 6개, `advice` 3개, 기존 인덱스 0 문장이 원본과 동일한지.

- [ ] **Step 4: 커밋**

```bash
git add data/saju-data.js
git commit -m "content(saju): convert gi/gyeong/sin/im/gye to a/b pool structure for random readings"
```

---

## Task 3: 영구 회귀 테스트 재작성 (`tests/saju-data.test.js`)

**Files:**
- Modify: `tests/saju-data.test.js`

**Interfaces:**
- Consumes: Task 1+2가 완성한 `ILGAN_DATA`의 `{a,b}`/풀 구조, `ELEMENT_BALANCE_TEXT`, `tests/helpers/dedup.js`의 기존 export(신규 함수 불필요)
- Produces: 없음(테스트 파일)

기존 `tests/saju-data.test.js`는 구 구조(문자열 필드) 기준이라 전체를 새 구조 기준으로 다시 쓴다.

- [ ] **Step 1: 파일 전체를 다음으로 교체**

```javascript
const assert = require('assert');
const { ILGAN_DATA, ELEMENT_BALANCE_TEXT, getIlganByIndex, getElementBalanceText } = require('../data/saju-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const EXPECTED_KEYS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];
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

function getField(ilgan, cat, sub) {
  return sub ? ilgan.categories[cat][sub] : ilgan.categories[cat];
}

function allFieldsOf() {
  return [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));
}

const FORBIDDEN_FIELD_SET = new Set();
FORBIDDEN_PAIRS.forEach(function (pairDef) {
  var catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
  subsA.forEach(function (subA) {
    subsB.forEach(function (subB) {
      var f1 = catA + (subA ? '.' + subA : ''), f2 = catB + (subB ? '.' + subB : '');
      FORBIDDEN_FIELD_SET.add(f1 + '|' + f2);
      FORBIDDEN_FIELD_SET.add(f2 + '|' + f1);
    });
  });
});

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

assert.strictEqual(ILGAN_DATA.length, 10, '일간은 10개여야 함');
assert.deepStrictEqual(ILGAN_DATA.map(d => d.key), EXPECTED_KEYS, '갑을병정무기경신임계 순서와 key가 일치해야 함');

ILGAN_DATA.forEach(function (ilgan) {
  assertPool(ilgan.trait, ilgan.key + '.trait');

  assert.ok(Array.isArray(ilgan.keywords) && ilgan.keywords.length === 6,
    ilgan.key + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(ilgan.keywords).size, 6, ilgan.key + ' keywords must all be distinct');

  assert.ok(Array.isArray(ilgan.advice) && ilgan.advice.length === 3,
    ilgan.key + ' advice must be an array of exactly 3 items');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    var keys = SUBDIVIDED_CATEGORIES[cat];
    assertPool(getField(ilgan, cat, keys[0]), ilgan.key + '.categories.' + cat + '.' + keys[0]);
    assertPool(getField(ilgan, cat, keys[1]), ilgan.key + '.categories.' + cat + '.' + keys[1]);
    assert.notStrictEqual(
      JSON.stringify(getField(ilgan, cat, keys[0])),
      JSON.stringify(getField(ilgan, cat, keys[1])),
      ilgan.key + ' categories.' + cat + ' sub-choices must not be identical'
    );
  });
  SINGLE_CATEGORIES.forEach(function (cat) {
    assertPool(getField(ilgan, cat, null), ilgan.key + '.categories.' + cat);
  });
});

console.log('All 10 ilgan have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

// ELEMENT_BALANCE_TEXT는 이번 랜덤화 대상이 아니므로 존재/개수만 회귀 확인한다
assert.strictEqual(Object.keys(ELEMENT_BALANCE_TEXT.excess).length, 5, 'ELEMENT_BALANCE_TEXT.excess must have 5 elements');
assert.strictEqual(Object.keys(ELEMENT_BALANCE_TEXT.deficient).length, 5, 'ELEMENT_BALANCE_TEXT.deficient must have 5 elements');
assert.ok(typeof ELEMENT_BALANCE_TEXT.balanced === 'string' && ELEMENT_BALANCE_TEXT.balanced.length > 0, 'ELEMENT_BALANCE_TEXT.balanced must be a non-empty string');

console.log('ELEMENT_BALANCE_TEXT structure unchanged (13 fixed strings)');

// ---------------------------------------------------------------------------
// 중복 검사 — 6개 축
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10;
const NEARVERBATIM_LCS_TH = 20;

function stripForEcho(s) {
  return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
}

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
    issues.push('lcs=' + lcs + ' stems=' + shared.join(','));
  }
  return issues;
}

// axis 1: 필드 내부 자기중복
const withinFieldCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      var pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          var issues = fullCombinedIssues(pool[i], pool[j], ilgan.keywords);
          if (issues.length) {
            withinFieldCollisions.push(ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
          }
        }
      }
    });
  });
});
assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));
console.log('No within-field a/b pool self-collisions');

// axis 2: advice 풀 자기중복
const adviceCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  for (let i = 0; i < ilgan.advice.length; i++) {
    for (let j = i + 1; j < ilgan.advice.length; j++) {
      var wj = wordJaccard(ilgan.advice[i], ilgan.advice[j]);
      if (wj >= WORD_TH) {
        adviceCollisions.push(ilgan.name_kr + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + ilgan.advice[i] + '\n  ' + ilgan.advice[j]);
      }
    }
  }
});
assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));
console.log('No advice-pool self-collisions');

// axis 3: advice <-> 모든 b풀 + ELEMENT_BALANCE_TEXT echo (강화 지표, 잠긴-잠긴 스킵)
function echoIssue(s1, s2) {
  var wj = wordJaccard(s1, s2);
  var t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  var bj = bigramJaccard(t1, t2);
  var lcs = longestCommonSubstring(t1, t2);
  if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) {
    return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
  }
  return null;
}

const BALANCE_TEXTS = Object.values(ELEMENT_BALANCE_TEXT.excess)
  .concat(Object.values(ELEMENT_BALANCE_TEXT.deficient))
  .concat([ELEMENT_BALANCE_TEXT.balanced]);

const echoCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    field.b.forEach(function (sB, j) {
      ilgan.advice.forEach(function (adv, i) {
        if (i === 0 && j === 0) return;
        var issue = echoIssue(adv, sB);
        if (issue) echoCollisions.push(ilgan.name_kr + ' advice[' + i + '] <-> ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] (' + issue + ')\n  ' + adv + '\n  ' + sB);
      });
    });
  });
  ilgan.advice.forEach(function (adv, i) {
    if (i === 0) return;
    BALANCE_TEXTS.forEach(function (bt, k) {
      var issue = echoIssue(adv, bt);
      if (issue) echoCollisions.push(ilgan.name_kr + ' advice[' + i + '] <-> balance[' + k + '] (' + issue + ')\n  ' + adv + '\n  ' + bt);
    });
  });
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    field.b.forEach(function (sB, j) {
      if (j === 0) return;
      BALANCE_TEXTS.forEach(function (bt, k) {
        var issue = echoIssue(sB, bt);
        if (issue) echoCollisions.push(ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] <-> balance[' + k + '] (' + issue + ')\n  ' + sB + '\n  ' + bt);
      });
    });
  });
});
assert.strictEqual(echoCollisions.length, 0,
  'Found ' + echoCollisions.length + ' advice<->b-pool/balance-text render-together echo collisions:\n' + echoCollisions.join('\n'));
console.log('No advice<->b-pool/balance-text render-together echo collisions');

// axis 4: 금지쌍 (a는 3단 결합, 잠긴-잠긴 스킵 / b는 단순)
const forbiddenACollisions = [];
const forbiddenBCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    var catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        var fA = getField(ilgan, catA, subA), fB = getField(ilgan, catB, subB);
        fA.a.forEach(function (sA, i) {
          fB.a.forEach(function (sB, j) {
            if (i === 0 && j === 0) return;
            var issues = fullCombinedIssues(sA, sB, ilgan.keywords);
            if (issues.length) {
              forbiddenACollisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + '.a' + i + ' <-> ' + catB + '.' + subB + '.a' + j + ' (' + issues.join(' | ') + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
        fA.b.forEach(function (sA, i) {
          fB.b.forEach(function (sB, j) {
            var wj = wordJaccard(sA, sB);
            if (wj >= WORD_TH) {
              forbiddenBCollisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + '.b' + i + ' <-> ' + catB + '.' + subB + '.b' + j + ' (word=' + wj.toFixed(2) + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
      });
    });
  });
});
assert.strictEqual(forbiddenACollisions.length, 0,
  'Found ' + forbiddenACollisions.length + ' forbidden-pair a-pool collisions:\n' + forbiddenACollisions.join('\n'));
console.log('No forbidden-pair a-pool collisions');
assert.strictEqual(forbiddenBCollisions.length, 0,
  'Found ' + forbiddenBCollisions.length + ' forbidden-pair b-pool collisions:\n' + forbiddenBCollisions.join('\n'));
console.log('No forbidden-pair b-pool collisions');

// axis 5: 일간 간 완전동일 검사
const exactMatchMap = new Map();
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s) {
        var where = ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot;
        if (!exactMatchMap.has(s)) exactMatchMap.set(s, []);
        exactMatchMap.get(s).push(where);
      });
    });
  });
});
const exactMatchCollisions = [];
exactMatchMap.forEach(function (locations, text) {
  if (locations.length > 1) {
    exactMatchCollisions.push('"' + text + '" appears in: ' + locations.join(' | '));
  }
});
assert.strictEqual(exactMatchCollisions.length, 0,
  'Found ' + exactMatchCollisions.length + ' cross-entity exact-match collisions:\n' + exactMatchCollisions.join('\n'));
console.log('No cross-entity exact-match collisions');

// axis 6: 같은 일간 내 비금지쌍 근접축자 (LCS>=20, 잠긴-잠긴 스킵)
const nearVerbatimCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  var fields = allFieldsOf();
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      var cat1 = fields[i][0], sub1 = fields[i][1], cat2 = fields[j][0], sub2 = fields[j][1];
      var f1name = cat1 + (sub1 ? '.' + sub1 : ''), f2name = cat2 + (sub2 ? '.' + sub2 : '');
      if (FORBIDDEN_FIELD_SET.has(f1name + '|' + f2name)) continue;
      var F1 = cat1 === 'trait' ? ilgan.trait : getField(ilgan, cat1, sub1);
      var F2 = cat2 === 'trait' ? ilgan.trait : getField(ilgan, cat2, sub2);
      ['a', 'b'].forEach(function (slot) {
        F1[slot].forEach(function (s1, x) {
          F2[slot].forEach(function (s2, y) {
            if (x === 0 && y === 0) return;
            var t1 = stripForEcho(s1), t2 = stripForEcho(s2);
            var lcs = longestCommonSubstring(t1, t2);
            if (lcs >= NEARVERBATIM_LCS_TH) {
              nearVerbatimCollisions.push(ilgan.name_kr + ' ' + f1name + '.' + slot + x + ' <-> ' + f2name + '.' + slot + y + ' (lcs=' + lcs + ')\n  ' + s1 + '\n  ' + s2);
            }
          });
        });
      });
    }
  }
});
assert.strictEqual(nearVerbatimCollisions.length, 0,
  'Found ' + nearVerbatimCollisions.length + ' same-entity non-forbidden-pair near-verbatim collisions:\n' + nearVerbatimCollisions.join('\n'));
console.log('No same-entity non-forbidden-pair near-verbatim collisions');

// ---------------------------------------------------------------------------
// 조회 함수 회귀 확인
// ---------------------------------------------------------------------------

assert.strictEqual(getIlganByIndex(0).key, 'gap', 'getIlganByIndex(0) should resolve to gap');
assert.strictEqual(getIlganByIndex(9).key, 'gye', 'getIlganByIndex(9) should resolve to gye');
assert.strictEqual(
  getElementBalanceText({ state: 'excess', element: '목' }),
  ELEMENT_BALANCE_TEXT.excess.목,
  'getElementBalanceText should resolve excess/목 correctly'
);
assert.strictEqual(
  getElementBalanceText({ state: 'balanced' }),
  ELEMENT_BALANCE_TEXT.balanced,
  'getElementBalanceText should resolve balanced correctly'
);

console.log('getIlganByIndex()/getElementBalanceText() correctly resolve known inputs');

console.log('All saju-data tests passed');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/saju-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 실패하면 Task 1/2로 돌아가 해당 필드(항상 인덱스 1 또는 2)를 수정한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add tests/saju-data.test.js
git commit -m "test(saju): rewrite structure and 6-axis dedup regression tests for a/b pool structure"
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

1. **사주(신규 랜덤화) — 같은 선택 반복**: 사주 모드 → 임의 생년월일시 입력(같은 값으로 재입력 가능하도록 값을 기록) → "연애운" → "솔로" 선택 후 리딩 실행. 결과 화면(명식표+오행 균형 문장+카테고리 해설+키워드/조언)을 기록해둔다.
2. "새로운 리딩" 버튼으로 돌아가 **정확히 같은 생년월일시·카테고리·서브초이스**로 5~6회 반복 실행한다. 매번 카테고리 해설·키워드 조합·조언 중 최소 하나는 달라지는지, 명식표와 오행 균형 문장은 항상 동일한지(이 부분은 실제 계산값이라 랜덤화 대상이 아님) 확인한다.
3. 매번 나오는 해설이 오행 균형 문장과 나란히 봤을 때도 자연스러운지 확인한다(신규 echo 검사가 방지하려는 지점).
4. "오늘의운"(카테고리 미선택, `trait`+오행 균형 문장 함께 렌더)도 반복 실행해 문장이 달라지고 어색한 반복이 없는지 확인한다.
5. **회귀 — 타로**: 타로 모드로 카드 뽑기 → 정/역방향 해설과 키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
6. **회귀 — 띠운세**: 띠운세 모드로 리딩 실행 → 반복 시 결과가 계속 달라지는지 확인(사주 작업에 영향받지 않았는지).
7. **회귀 — 별자리**: 별자리 모드로 리딩 실행 → 반복 시 결과가 계속 달라지는지 확인(사주 작업에 영향받지 않았는지).
8. **회귀 — 궁합**: 궁합 모드로 리딩 실행 → 점수·해설·키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
9. "지난 기록"을 열어 방금 만든 사주 리딩들이 정상적으로 표시되는지 확인.
10. 콘솔에 에러가 없는지 확인.

Expected: 사주(1~4)는 반복 시 카테고리 해설/키워드/조언이 달라지고 문맥이 자연스러움(명식표·오행 문장은 고정), 타로/궁합(5,8)은 고정 문구 그대로, 띠운세/별자리(6,7)는 계속 랜덤화 동작, 9~10 정상.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인**

이 태스크는 검증 전용이라 기본적으로 커밋이 없다. Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(saju): ...` 커밋을 추가한다.
