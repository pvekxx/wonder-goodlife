# Kia Quote Calculator

기아 자동차 5개 차종에 대한 **견적 계산 CLI 도구**입니다.  
공식 가격표를 기반으로 **기본가 + 옵션가 + 색상 추가금 - 개소세 인하 혜택 - 친환경 세제 혜택**을 계산합니다.  

Node.js 18+ 이상에서 실행 가능합니다.

## 실행 방법
### 1. 저장소 클론
### 2. 단건 실행 : 특정 모델/트림/옵션/색상에 대해 한 번만 견적을 계산합니다.
```bash
node quote_cli.mjs \
  --models ./src/data/cars.json \
  --model seltos \
  --trim 16t-xline \
  --options daw,sconn \
  --color SWP
  ```
   실행 예시 :
   ```
=== seltos / 16t-xline / color=SWP ===
기본가 (1.6T X-Line) : 29,510,000원
옵션 합계            : 1,960,000원
개소세 인하 혜택        : -472,050원
총액               : 30,997,950원
  └─ 옵션 내역:
     - 드라이브 와이즈  (+990,000원)
     - 컨비니언스  (기본)
     - 스타일  (기본)
     - 10.25인치 내비게이션  (기본)
     - 스마트 커넥트  (+890,000원)
     - 외장색상(스노우 화이트 펄)  (+80,000원)
   ```
### 3. 시나리오 실행 : scenarios.json 파일에 여러 케이스를 정의해두고, 한 번에 결과를 출력합니다.
```bash
node quote_cli.mjs \
  --models ./src/data/cars.json \
  --scenarios ./scenarios.json \
  --csv ./result.csv
```
- 콘솔에 모든 케이스의 견적 요약이 출력됩니다.
- result.csv파일이 생성되어, 엑셀에서 확인할수 있습니다.
### 4. 파일 구조
```
.
├── src/
│   └── data/
│       └── cars.json     # 차량 데이터 (기본가, 옵션, 색상, 가격정책 등)
├── scenarios.json        # 테스트용 시나리오 입력 파일
├── result.csv            # 실행 후 생성되는 결과 파일
└── quote_cli.mjs         # CLI 실행 스크립트
```
### 5. 시나리오 예시 (scenarios.json)
```json
[
    {
        "model": "ray",
        "trim": "prestige",
        "options": "style,daw",
        "color": "UD"
    },
    {
        "model": "seltos",
        "trim": "16t-xline",
        "options": "daw,sconn",
        "color": "SWP"
    },
    {
        "model": "sportage-hev",
        "trim": "prestige",
        "options": "style",
        "color": "SWP"
    }
]
```