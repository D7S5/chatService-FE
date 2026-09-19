# ChatService Frontend

React로 구현한 실시간 채팅 서비스의 프론트엔드입니다. 이메일 및 소셜 로그인, 공개·비공개 그룹 채팅, 1:1 DM, 친구 관리, 접속 상태 확인을 지원합니다. REST API는 Axios로, 실시간 이벤트는 STOMP over SockJS로 처리합니다.

## 주요 기능

- 이메일 회원가입 및 로그인
- Google, Naver, Kakao OAuth2 로그인
- 액세스 토큰 자동 첨부 및 401 응답 시 토큰 갱신
- 닉네임 설정 및 변경
- 공개·비공개 그룹 채팅방 생성 및 참여
- 초대 코드 발급 및 초대 코드로 비공개 방 입장
- 그룹 채팅 및 1:1 DM 실시간 메시지 전송
- 클립보드에 복사한 이미지 붙여넣기 전송
- 친구 요청, 수락, 거절, 삭제 및 친구의 온라인 상태 표시
- 채팅방 참여자와 현재 인원 표시
- 방장·관리자의 관리자 지정, 강퇴 및 차단
- 메시지 전송 속도 제한 및 강제 퇴장 이벤트 처리

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| UI | React 19, CSS, Material UI |
| 라우팅 | React Router 6 |
| HTTP | Axios |
| 실시간 통신 | STOMP, SockJS |
| 폼·알림 | React Hook Form, React Toastify |
| 테스트 | Jest, React Testing Library |
| 빌드 | Create React App (`react-scripts`) |

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm
- `http://localhost:9090`에서 실행 중인 ChatService 백엔드

### 설치 및 실행

```bash
git clone https://github.com/D7S5/chatService-FE.git
cd chatapp
npm ci
npm start
```

개발 서버는 기본적으로 [http://localhost:3000](http://localhost:3000)에서 실행됩니다. `package.json`의 proxy 설정에 따라 `/api` 요청은 `http://localhost:9090`으로 전달됩니다.

## 환경 설정

소셜 로그인 요청에 사용할 백엔드 주소가 프런트엔드와 다른 경우 프로젝트 루트에 `.env.local`을 생성합니다.

```dotenv
REACT_APP_API_BASE=http://localhost:9090
```

환경 변수를 변경한 후에는 개발 서버를 다시 시작해야 합니다.

현재 주소 설정 방식은 다음과 같습니다.

| 용도 | 개발 환경 | 프로덕션 환경 |
| --- | --- | --- |
| REST API | `/api` → CRA proxy의 `http://localhost:9090` | 동일 출처의 `/api` |
| WebSocket | `http://localhost:9090/ws` | 동일 출처의 `/ws` |
| OAuth2 시작 URL | `REACT_APP_API_BASE` 또는 각 버튼의 기본 주소 | `REACT_APP_API_BASE` 또는 현재 출처 |

> `REACT_APP_API_BASE`는 OAuth2 리다이렉트 시작 주소에만 사용됩니다. REST API와 개발 WebSocket 주소를 변경하려면 각각 `src/api.js`, `src/websocket.js`, 그리고 필요 시 `package.json`의 proxy 설정도 함께 수정해야 합니다.

## 백엔드 연동 조건

이 저장소에는 프런트엔드만 포함되어 있습니다. 정상 동작하려면 백엔드가 아래 항목을 제공해야 합니다.

- `/api` 하위의 인증, 사용자, 친구, 채팅방, DM 및 이미지 업로드 API
- `/ws` SockJS 엔드포인트와 STOMP 메시지 브로커
- `/oauth2/authorization/{provider}` OAuth2 인증 시작 엔드포인트
- 프런트엔드의 `/oauth/success?token=...` 또는 `/oauth/nickname?token=...`으로 이어지는 OAuth2 로그인 흐름
- Refresh Token 쿠키를 사용할 수 있는 CORS 및 credential 설정

인증 성공 후 브라우저 `localStorage`에는 `accessToken`, `userId`, `username`이 저장됩니다. Axios 인터셉터는 액세스 토큰을 `Authorization: Bearer <token>` 헤더로 전송하며, 인증이 만료되면 `/api/auth/refresh`를 호출합니다. WebSocket 연결 전에는 `/api/ws/token`에서 별도의 연결 토큰을 발급받습니다.

## 화면 경로

| 경로 | 화면 |
| --- | --- |
| `/` | 이메일·소셜 로그인 |
| `/signup` | 회원가입 |
| `/nickname` | 닉네임 설정 및 변경 |
| `/lobby` | 채팅방, DM, 친구 및 접속자 목록 |
| `/rooms/:roomId` | 그룹 채팅방 |
| `/dm/list` | DM 목록 |
| `/dm/:roomId` | 1:1 DM |
| `/oauth/success` | OAuth2 로그인 콜백 처리 |
| `/oauth/nickname` | OAuth2 신규 사용자의 닉네임 설정 |

## 실시간 통신 흐름

1. 로그인한 사용자가 화면에 진입하면 `/api/ws/token`에서 WebSocket 토큰을 발급받습니다.
2. SockJS로 `/ws?ws-token=...`에 연결하고 STOMP 세션을 활성화합니다.
3. 로비에서는 온라인 사용자, 채팅방 및 친구 이벤트를 구독합니다.
4. 채팅방에서는 메시지, 참여자, 인원 수, 속도 제한 및 강제 퇴장 이벤트를 구독합니다.
5. 연결은 STOMP 자체 재연결 설정과 주기적인 토큰 재발급 연결로 갱신됩니다.

## 프로젝트 구조

```text
chatapp/
├── public/                    # 정적 파일과 HTML 템플릿
├── src/
│   ├── assets/               # OAuth 로그인 이미지
│   ├── components/
│   │   ├── groupChat/        # 그룹 채팅방, 참여자, 초대 코드 UI
│   │   ├── LoginUnified.jsx  # 이메일·소셜 로그인
│   │   ├── Lobby.js          # 서비스 메인 로비
│   │   ├── PrivateChat.js    # 1:1 DM
│   │   └── ...
│   ├── oauth/                # OAuth 공급자별 로그인 버튼
│   ├── api.js                # Axios 인스턴스와 토큰 갱신 처리
│   ├── websocket.js          # STOMP/SockJS 연결 관리
│   ├── chatImages.js         # 클립보드 이미지 추출 및 업로드
│   ├── App.js                # 애플리케이션 라우팅
│   └── index.js              # React 진입점
├── package.json
└── README.md
```

## 명령어

```bash
npm start          # 개발 서버 실행
npm test           # 테스트를 watch 모드로 실행
npm run build      # 프로덕션 번들 생성
```

CI처럼 테스트를 한 번만 실행하려면 다음 명령을 사용할 수 있습니다.

```bash
CI=true npm test -- --watchAll=false
```

프로덕션 빌드 결과는 `build/` 디렉터리에 생성됩니다. 배포 서버는 SPA의 클라이언트 라우팅을 위해 알 수 없는 경로를 `index.html`로 전달해야 하며, `/api`와 `/ws`는 백엔드로 프록시해야 합니다.

## 개발 시 참고 사항

- 채팅 이미지는 파일 선택 버튼이 아니라 메시지 입력창의 붙여넣기 이벤트로 전송합니다.
- 그룹 채팅의 초기 메시지는 최근 50개를 조회합니다.
- 비공개 방의 초대 코드는 UI 안내 기준 10분 후 만료됩니다.
- 현재 테스트는 Jest가 Axios의 ESM 엔트리를 변환하지 못해 실행 단계에서 실패합니다. Jest 변환 설정 또는 Axios 모킹이 필요하며, 이후 `src/App.test.js`의 Create React App 기본 예제 문구 검사도 현재 로그인 화면 기준으로 갱신해야 합니다.
- `ProtectedRoute` 컴포넌트가 존재하지만 현재 `App.js` 라우트에는 적용되어 있지 않습니다. 각 주요 화면은 저장된 사용자 정보 또는 API 응답을 기준으로 접근을 처리합니다.
