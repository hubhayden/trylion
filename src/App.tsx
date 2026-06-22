import { useEffect, useMemo, useRef, useState } from "react";
import { classifyUrl } from "./lib/classify";
import {
  MIN_REDEEMABLE_POINTS,
  REWARD_POINT_VALUE,
  formatPoints,
  formatWon,
  getWeekRange,
  hasWeeklyUpload,
  isInRange,
  userStats,
} from "./lib/calculations";
import { defaultScoreRules } from "./lib/defaults";
import { loadData, loadPreferredUserId, loadSheetsData, loadStorageSettings, saveData, savePreferredUserId, saveStorageSettings, saveSheetsData } from "./lib/storage";
import type { AppData, RewardUsage, ScoreRule, StorageSettings, UploadRecord, User } from "./lib/types";

type Tab = "home" | "add" | "records" | "rewards" | "rules" | "users" | "sync";
const CUSTOM_TYPE_ID = "custom";
const adminTabs = new Set<Tab>(["rules", "users", "sync"]);

const tabs: { id: Tab; label: string }[] = [
  { id: "home", label: "홈" },
  { id: "add", label: "기록하기" },
  { id: "records", label: "기록 목록" },
  { id: "rewards", label: "보상 사용" },
  { id: "rules", label: "점수 설정" },
  { id: "users", label: "참여자 관리" },
  { id: "sync", label: "연동 설정" },
];

const todayInput = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [settings, setSettings] = useState<StorageSettings>(() => loadStorageSettings());
  const [syncStatus, setSyncStatus] = useState("로컬 저장 중");
  const [preferredUserId, setPreferredUserId] = useState(() => loadPreferredUserId());
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const didFinishInitialSheetsLoad = useRef(false);
  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";
  const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => !adminTabs.has(tab.id));
  const activeRules = data.scoreRules.filter((rule) => rule.isActive);

  useEffect(() => {
    saveData(data);
    if (settings.mode === "sheets" && settings.sheetsApiUrl) {
      if (!didFinishInitialSheetsLoad.current) return;
      setSyncStatus("Google Sheets에 저장 중...");
      saveSheetsData(settings.sheetsApiUrl, data)
        .then(() => setSyncStatus("Google Sheets 연동 중"))
        .catch(() => setSyncStatus("Sheets 저장 실패 - 로컬에는 저장됨"));
    } else {
      setSyncStatus("로컬 저장 중");
    }
  }, [data, settings.mode, settings.sheetsApiUrl]);

  useEffect(() => {
    saveStorageSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.mode !== "sheets" || !settings.sheetsApiUrl) {
      didFinishInitialSheetsLoad.current = true;
      return;
    }
    didFinishInitialSheetsLoad.current = false;
    setSyncStatus("Google Sheets에서 불러오는 중...");
    loadSheetsData(settings.sheetsApiUrl)
      .then((remoteData) => {
        didFinishInitialSheetsLoad.current = true;
        setData(remoteData);
        saveData(remoteData);
        setSyncStatus("Google Sheets 연동 중");
      })
      .catch(() => {
        didFinishInitialSheetsLoad.current = true;
        setSyncStatus("Sheets 불러오기 실패 - 로컬 데이터 사용 중");
      });
  }, [settings.mode, settings.sheetsApiUrl]);

  useEffect(() => {
    const requestedUser = new URLSearchParams(window.location.search).get("user");
    if (!requestedUser) return;
    const matchedUser = data.users.find((user) => user.id === requestedUser || user.name === requestedUser);
    if (!matchedUser) return;
    setPreferredUserId(matchedUser.id);
    savePreferredUserId(matchedUser.id);
  }, [data.users]);

  useEffect(() => {
    if (!preferredUserId) return;
    savePreferredUserId(preferredUserId);
  }, [preferredUserId]);

  useEffect(() => {
    if (!isAdmin && adminTabs.has(activeTab)) {
      setActiveTab("home");
    }
  }, [activeTab, isAdmin]);

  const updateData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">두 사자의 창작 습관 적금</p>
          <h1>Try! Lion!</h1>
        </div>
      </header>

      <SyncBanner settings={settings} syncStatus={syncStatus} />

      <nav className="tabs" aria-label="주요 화면">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === "home" && <Home data={data} goTo={setActiveTab} />}
        {activeTab === "add" && (
          <AddRecord
            users={data.users}
            rules={activeRules}
            preferredUserId={preferredUserId}
            onPreferredUserChange={setPreferredUserId}
            onSave={(record) =>
              updateData((current) => ({
                ...current,
                uploadRecords: [record, ...current.uploadRecords],
              }))
            }
          />
        )}
        {activeTab === "records" && (
          <RecordList
            data={data}
            onDelete={
              isAdmin
                ? (recordId) =>
                    updateData((current) => ({
                      ...current,
                      uploadRecords: current.uploadRecords.filter((record) => record.id !== recordId),
                    }))
                : undefined
            }
          />
        )}
        {activeTab === "rewards" && (
          <Rewards
            data={data}
            preferredUserId={preferredUserId}
            onPreferredUserChange={setPreferredUserId}
            onSave={(usage) =>
              updateData((current) => ({
                ...current,
                rewardUsages: [usage, ...current.rewardUsages],
              }))
            }
          />
        )}
        {activeTab === "rules" && (
          <ScoreRules
            rules={data.scoreRules}
            onChange={(rules) => updateData((current) => ({ ...current, scoreRules: rules }))}
          />
        )}
        {activeTab === "users" && (
          <Users
            users={data.users}
            onChange={(users) => updateData((current) => ({ ...current, users }))}
          />
        )}
        {activeTab === "sync" && (
          <SyncSettings
            data={data}
            settings={settings}
            syncStatus={syncStatus}
            onSettingsChange={setSettings}
            onDataLoaded={(remoteData) => {
              setData(remoteData);
              saveData(remoteData);
            }}
          />
        )}
      </main>
    </div>
  );
}

function SyncBanner({ settings, syncStatus }: { settings: StorageSettings; syncStatus: string }) {
  return (
    <div className="sync-banner">
      <strong>{settings.mode === "sheets" ? "Google Sheets 연동 모드" : "로컬 저장 모드"}</strong>
      <span>{syncStatus}</span>
    </div>
  );
}

function Home({ data, goTo }: { data: AppData; goTo: (tab: Tab) => void }) {
  const week = getWeekRange();
  const recent = [...data.uploadRecords]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 5);
  const recentRewards = [...data.rewardUsages]
    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
    .slice(0, 5);

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">이번 주</p>
          <h2>
            {week.start.toLocaleDateString("ko-KR")} - {week.end.toLocaleDateString("ko-KR")}
          </h2>
        </div>
        <button className="primary" onClick={() => goTo("add")}>
          기록 남기기
        </button>
      </div>

      <div className="dashboard-grid">
        {data.users.map((user) => {
          const stats = userStats(user, data.uploadRecords, data.rewardUsages);
          const success = hasWeeklyUpload(user.id, data.uploadRecords);
          const latestUserRewards = data.rewardUsages
            .filter((usage) => usage.userId === user.id)
            .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
            .slice(0, 2);
          return (
            <article className="panel" key={user.id}>
              <div className="panel-top">
                <h3>{user.name}</h3>
                <span className={success ? "badge success" : "badge muted"}>
                  {success ? "이번 주 성공!" : "아직 업로드 전"}
                </span>
              </div>
              <p className="soft-text">
                {success
                  ? "작은 공개를 하나 해냈어요."
                  : "이번 주 아직 업로드 전이에요. 만나는 날 같이 하나만 올려도 성공!"}
              </p>
              <div className="stat-row">
                <Stat label="총 적립" value={formatPoints(stats.earned)} />
                <Stat label="총 사용" value={formatPoints(stats.used)} />
                <Stat label="남은 점수" value={formatPoints(stats.remaining)} highlight />
              </div>
              <div className="reward-note">
                {stats.remaining >= MIN_REDEEMABLE_POINTS
                  ? `사용 가능 금액 ${formatWon(stats.redeemableAmount)}`
                  : "10점 이상부터 보상 사용이 가능해요."}
              </div>
              <div className="mini-history">
                <strong>최근 보상 사용</strong>
                {latestUserRewards.length === 0 ? (
                  <span>아직 사용 내역이 없어요.</span>
                ) : (
                  latestUserRewards.map((usage) => (
                    <span key={usage.id}>
                      {usage.title} · {formatWon(usage.amount)} · {formatPoints(usage.pointsUsed)}
                    </span>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="panel">
        <div className="section-heading compact">
          <h2>최근 기록</h2>
          <button onClick={() => goTo("records")}>전체 보기</button>
        </div>
        {recent.length === 0 ? (
          <Empty text="아직 기록이 없어요. 첫 번째 작은 공개를 남겨보세요." />
        ) : (
          <div className="record-list">
            {recent.map((record) => (
              <RecordItem key={record.id} record={record} users={data.users} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>최근 보상 사용</h2>
          <button onClick={() => goTo("rewards")}>보상 사용하기</button>
        </div>
        {recentRewards.length === 0 ? (
          <Empty text="아직 보상 사용 기록이 없어요. 10점부터 자유롭게 사용할 수 있어요." />
        ) : (
          <div className="record-list">
            {recentRewards.map((usage) => (
              <RewardItem key={usage.id} usage={usage} users={data.users} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function AddRecord({
  users,
  rules,
  preferredUserId,
  onPreferredUserChange,
  onSave,
}: {
  users: User[];
  rules: ScoreRule[];
  preferredUserId: string;
  onPreferredUserChange: (userId: string) => void;
  onSave: (record: UploadRecord) => void;
}) {
  const [userId, setUserId] = useState(preferredUserId || users[0]?.id || "");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("URL 없음");
  const [contentTypeId, setContentTypeId] = useState("");
  const [customTypeName, setCustomTypeName] = useState("");
  const [customPoints, setCustomPoints] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [recordedAt, setRecordedAt] = useState(todayInput());
  const [message, setMessage] = useState("");

  useEffect(() => {
    const preferredExists = users.some((user) => user.id === preferredUserId);
    if (preferredExists && userId !== preferredUserId) {
      setUserId(preferredUserId);
      return;
    }
    if (!userId && users[0]) setUserId(users[0].id);
  }, [users, userId, preferredUserId]);

  useEffect(() => {
    const result = classifyUrl(url, rules);
    setPlatform(result.platform);
    if (result.contentTypeId) {
      setContentTypeId(result.contentTypeId);
    } else if (result.needsManualType && url.trim()) {
      setContentTypeId(CUSTOM_TYPE_ID);
    }
  }, [url, rules]);

  const isCustomType = contentTypeId === CUSTOM_TYPE_ID;
  const selectedRule = rules.find((rule) => rule.id === contentTypeId);
  const customPointValue = Number(customPoints);
  const customTypeValid = isCustomType && customTypeName.trim().length > 0 && customPointValue > 0;
  const canSave = users.length > 0 && userId && (selectedRule || customTypeValid);

  const save = () => {
    if (!userId) {
      setMessage("참여자를 선택해 주세요.");
      return;
    }
    if (isCustomType && !customTypeValid) {
      setMessage("기타/직접 입력은 형식 이름과 0보다 큰 점수가 필요해요.");
      return;
    }
    if (!isCustomType && !selectedRule) {
      setMessage("콘텐츠 유형을 선택해 주세요.");
      return;
    }

    const contentTypeName = isCustomType ? customTypeName.trim() : selectedRule!.name;
    const pointsEarned = isCustomType ? customPointValue : selectedRule!.points;

    onSave({
      id: makeId("upload"),
      userId,
      url: url.trim(),
      platform: platform.trim() || "기타",
      contentTypeId: isCustomType ? CUSTOM_TYPE_ID : selectedRule!.id,
      contentTypeName,
      customTypeName: isCustomType ? contentTypeName : undefined,
      isCustomType,
      pointsEarned,
      memo: [customDescription.trim(), memo.trim()].filter(Boolean).join(" / "),
      recordedAt: new Date(recordedAt).toISOString(),
      createdAt: now(),
    });

    setUrl("");
    setPlatform("URL 없음");
    setContentTypeId("");
    setCustomTypeName("");
    setCustomPoints("");
    setCustomDescription("");
    setMemo("");
    setRecordedAt(todayInput());
    setMessage("기록을 저장했어요. 점수는 저장 시점 기준으로 고정됩니다.");
  };

  return (
    <section className="panel form-panel">
      <h2>기록하기</h2>
      {users.length === 0 && <Alert text="참여자가 없으면 기록을 추가할 수 없어요." />}
      {rules.length === 0 && <Alert text="사용할 수 있는 점수 유형이 없어요. 점수 설정에서 유형을 추가해 주세요." />}

      <div className="form-grid">
        <label>
          참여자
          <select value={userId} onChange={(event) => { setUserId(event.target.value); onPreferredUserChange(event.target.value); }}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          기록 날짜
          <input type="date" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} />
        </label>
      </div>

      <label>
        URL
        <input
          value={url}
          placeholder="URL 없이 수동 기록도 가능해요"
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>

      <div className="classification-box">
        <span>자동 분류 결과</span>
        <strong>{platform}</strong>
        <small>{url.trim() ? "검증이 아닌 분류용 기록입니다." : "URL 없음 상태로 저장됩니다."}</small>
      </div>

      <label>
        콘텐츠 유형
        <select value={contentTypeId} onChange={(event) => setContentTypeId(event.target.value)}>
          <option value="">직접 선택</option>
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name} / {formatPoints(rule.points)}
            </option>
          ))}
          <option value={CUSTOM_TYPE_ID}>기타/직접 입력</option>
        </select>
      </label>

      {isCustomType && (
        <div className="custom-type-box">
          <label>
            직접 입력한 형식 이름
            <input
              value={customTypeName}
              onChange={(event) => setCustomTypeName(event.target.value)}
              placeholder="예: 전시 참여, 뉴스레터 발행, 블로그 글"
            />
          </label>
          <label>
            직접 입력 점수
            <input
              type="number"
              min="0"
              step="0.1"
              value={customPoints}
              onChange={(event) => setCustomPoints(event.target.value)}
              placeholder="예: 0.5, 1, 2, 3, 5"
            />
          </label>
          <label className="wide">
            직접 입력 설명
            <input
              value={customDescription}
              onChange={(event) => setCustomDescription(event.target.value)}
              placeholder="이 기록에만 남길 설명을 적어주세요"
            />
          </label>
        </div>
      )}

      <label>
        메모
        <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="작업 내용이나 기분을 짧게 남겨보세요" />
      </label>

      <div className="action-row">
        <strong>
          적립 예정:{" "}
          {isCustomType
            ? customPointValue > 0
              ? formatPoints(customPointValue)
              : "직접 입력 점수 필요"
            : selectedRule
              ? formatPoints(selectedRule.points)
              : "유형 선택 필요"}
        </strong>
        <button className="primary" disabled={!canSave} onClick={save}>
          기록 저장
        </button>
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}

function RecordList({
  data,
  onDelete,
}: {
  data: AppData;
  onDelete?: (recordId: string) => void;
}) {
  const [userFilter, setUserFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [weekOnly, setWeekOnly] = useState(false);
  const week = getWeekRange();

  const records = useMemo(() => {
    return [...data.uploadRecords]
      .filter((record) => userFilter === "all" || record.userId === userFilter)
      .filter((record) =>
        typeFilter === "all" ? true : typeFilter === CUSTOM_TYPE_ID ? record.isCustomType : record.contentTypeId === typeFilter,
      )
      .filter((record) => !weekOnly || isInRange(record.recordedAt, week.start, week.end))
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }, [data.uploadRecords, userFilter, typeFilter, weekOnly]);

  return (
    <section className="panel">
      <div className="section-heading compact">
        <h2>기록 목록</h2>
        <label className="inline-check">
          <input type="checkbox" checked={weekOnly} onChange={(event) => setWeekOnly(event.target.checked)} />
          이번 주만
        </label>
      </div>
      <div className="filters">
        <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
          <option value="all">전체 참여자</option>
          {data.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">전체 유형</option>
          {data.scoreRules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
          <option value={CUSTOM_TYPE_ID}>기타/직접 입력</option>
        </select>
      </div>
      {records.length === 0 ? (
        <Empty text={weekOnly ? "이번 주 아직 업로드 전이에요. 만나는 날 같이 하나만 올려도 성공이에요." : "아직 기록이 없어요. 첫 번째 작은 공개를 남겨보세요."} />
      ) : (
        <div className="record-list">
          {records.map((record) => (
            <RecordItem key={record.id} record={record} users={data.users} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}

function Rewards({ data, preferredUserId, onPreferredUserChange, onSave }: { data: AppData; preferredUserId: string; onPreferredUserChange: (userId: string) => void; onSave: (usage: RewardUsage) => void }) {
  const [userId, setUserId] = useState(preferredUserId || data.users[0]?.id || "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [usedAt, setUsedAt] = useState(todayInput());
  const [message, setMessage] = useState("");
  const user = data.users.find((item) => item.id === userId);
  const stats = user ? userStats(user, data.uploadRecords, data.rewardUsages) : undefined;
  const numericAmount = Number(amount);
  const pointsUsed = numericAmount > 0 ? numericAmount / REWARD_POINT_VALUE : 0;
  const canUse =
    !!user &&
    !!stats &&
    stats.remaining >= MIN_REDEEMABLE_POINTS &&
    title.trim().length > 0 &&
    numericAmount > 0 &&
    pointsUsed <= stats.remaining;

  const save = () => {
    if (!user || !stats) {
      setMessage("참여자를 먼저 추가해 주세요.");
      return;
    }
    if (stats.remaining < MIN_REDEEMABLE_POINTS) {
      setMessage("10점부터 보상 사용이 가능해요. 조금만 더 쌓아볼까요?");
      return;
    }
    if (!title.trim() || numericAmount <= 0) {
      setMessage("사용처와 0원보다 큰 사용 금액을 입력해 주세요.");
      return;
    }
    if (pointsUsed > stats.remaining) {
      setMessage("사용 점수가 남은 점수보다 커서 저장할 수 없어요.");
      return;
    }

    onSave({
      id: makeId("reward"),
      userId: user.id,
      title: title.trim(),
      amount: numericAmount,
      pointsUsed,
      memo: memo.trim(),
      usedAt: new Date(usedAt).toISOString(),
      createdAt: now(),
    });
    setTitle("");
    setAmount("");
    setMemo("");
    setUsedAt(todayInput());
    setMessage("보상 사용 기록을 저장했어요.");
  };

  return (
    <section className="panel form-panel">
      <h2>보상 사용</h2>
      <div className="form-grid">
        <label>
          참여자
          <select value={userId} onChange={(event) => { setUserId(event.target.value); onPreferredUserChange(event.target.value); }}>
            {data.users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          사용 날짜
          <input type="date" value={usedAt} onChange={(event) => setUsedAt(event.target.value)} />
        </label>
      </div>
      {stats && (
        <div className="balance-box">
          <Stat label="남은 점수" value={formatPoints(stats.remaining)} highlight />
          <Stat
            label="사용 가능"
            value={stats.remaining >= MIN_REDEEMABLE_POINTS ? formatWon(stats.redeemableAmount) : "아직 사용 불가"}
          />
        </div>
      )}
      {stats && stats.remaining < MIN_REDEEMABLE_POINTS && (
        <Alert text="10점부터 보상 사용이 가능해요. 조금만 더 쌓아볼까요?" />
      )}
      <label>
        사용처 또는 제목
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 전시 티켓, 재료 구매" />
      </label>
      <label>
        사용 금액
        <input
          type="number"
          min="0"
          step="1000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="50000"
        />
      </label>
      <div className="classification-box">
        <span>자동 계산된 차감 점수</span>
        <strong>{formatPoints(pointsUsed)}</strong>
        <small>1점 = 10,000원 기준으로 계산됩니다.</small>
      </div>
      <label>
        메모
        <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="선택 입력" />
      </label>
      <div className="action-row">
        <strong>차감 예정: {formatPoints(pointsUsed)}</strong>
        <button className="primary" disabled={!canUse} onClick={save}>
          보상 사용 저장
        </button>
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}

function ScoreRules({
  rules,
  onChange,
}: {
  rules: ScoreRule[];
  onChange: (rules: ScoreRule[]) => void;
}) {
  const addRule = () => {
    onChange([
      {
        id: makeId("rule"),
        name: "새 점수 유형",
        points: 1,
        description: "",
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      },
      ...rules,
    ]);
  };

  const updateRule = (id: string, patch: Partial<ScoreRule>) => {
    onChange(
      rules.map((rule) =>
        rule.id === id ? { ...rule, ...patch, updatedAt: now(), points: Number(patch.points ?? rule.points) } : rule,
      ),
    );
  };

  return (
    <section className="panel">
      <div className="section-heading compact">
        <h2>점수 설정</h2>
        <div className="button-group">
          <button onClick={addRule}>새 유형 추가</button>
          <button onClick={() => onChange(defaultScoreRules())}>기본 점수표 복구</button>
        </div>
      </div>
      <p className="soft-text">
        점수 변경은 새 기록부터 적용돼요. 이미 저장된 기록의 적립 점수는 바뀌지 않습니다.
      </p>
      {rules.length === 0 ? (
        <Empty text="사용할 수 있는 점수 유형이 없어요. 점수 설정에서 유형을 추가해 주세요." />
      ) : (
        <div className="rule-list">
          {rules.map((rule) => (
            <article className="rule-card" key={rule.id}>
              <label>
                이름
                <input value={rule.name} onChange={(event) => updateRule(rule.id, { name: event.target.value })} />
              </label>
              <label>
                점수
                <input
                  type="number"
                  step="0.1"
                  value={rule.points}
                  onChange={(event) => updateRule(rule.id, { points: Number(event.target.value) })}
                />
              </label>
              <label className="wide">
                설명
                <input
                  value={rule.description}
                  onChange={(event) => updateRule(rule.id, { description: event.target.value })}
                />
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={rule.isActive}
                  onChange={(event) => updateRule(rule.id, { isActive: event.target.checked })}
                />
                새 기록에서 사용
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SyncSettings({
  data,
  settings,
  syncStatus,
  onSettingsChange,
  onDataLoaded,
}: {
  data: AppData;
  settings: StorageSettings;
  syncStatus: string;
  onSettingsChange: (settings: StorageSettings) => void;
  onDataLoaded: (data: AppData) => void;
}) {
  const [url, setUrl] = useState(settings.sheetsApiUrl);
  const [message, setMessage] = useState("");

  const applyLocal = () => {
    onSettingsChange({ mode: "local", sheetsApiUrl: url.trim() });
    setMessage("로컬 저장 모드로 바꿨어요. 이 기기에서만 데이터가 유지됩니다.");
  };

  const applySheets = () => {
    if (!url.trim()) {
      setMessage("Apps Script 웹앱 URL을 입력해 주세요.");
      return;
    }
    onSettingsChange({ mode: "sheets", sheetsApiUrl: url.trim() });
    setMessage("Google Sheets 연동 모드로 바꿨어요. 곧 원격 데이터를 불러옵니다.");
  };

  const loadRemote = () => {
    if (!url.trim()) {
      setMessage("Apps Script 웹앱 URL을 입력해 주세요.");
      return;
    }
    setMessage("Google Sheets에서 불러오는 중...");
    loadSheetsData(url.trim())
      .then((remoteData) => {
        onDataLoaded(remoteData);
        setMessage("Google Sheets 데이터를 불러왔어요.");
      })
      .catch(() => setMessage("불러오기에 실패했어요. Apps Script 배포 URL을 확인해 주세요."));
  };

  const pushLocal = () => {
    if (!url.trim()) {
      setMessage("Apps Script 웹앱 URL을 입력해 주세요.");
      return;
    }
    setMessage("현재 로컬 데이터를 Google Sheets에 올리는 중...");
    saveSheetsData(url.trim(), data)
      .then(() => setMessage("현재 데이터를 Google Sheets에 올렸어요."))
      .catch(() => setMessage("올리기에 실패했어요. Apps Script 배포 URL을 확인해 주세요."));
  };

  return (
    <section className="panel form-panel">
      <h2>Google Sheets 연동 설정</h2>
      <p className="soft-text">
        기본은 localStorage를 유지합니다. Apps Script 웹앱 URL을 넣고 Sheets 모드를 켜면 친구들과 같은 데이터를 같이 볼 수 있어요.
      </p>
      <div className="balance-box">
        <Stat label="현재 모드" value={settings.mode === "sheets" ? "Google Sheets" : "로컬 저장"} highlight />
        <Stat label="상태" value={syncStatus} />
      </div>
      <label>
        Apps Script 웹앱 URL
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://script.google.com/macros/s/.../exec"
        />
      </label>
      <div className="button-group wrap">
        <button className="primary" onClick={applySheets}>Sheets 연동 켜기</button>
        <button onClick={applyLocal}>로컬 모드로 사용</button>
        <button onClick={loadRemote}>Sheets에서 불러오기</button>
        <button onClick={pushLocal}>현재 데이터를 Sheets에 올리기</button>
      </div>
      <div className="alert">
        친구에게는 Vercel/Netlify에 배포된 앱 URL을 보내고, 이 Apps Script URL은 앱 설정에만 넣어주세요.
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}

function Users({ users, onChange }: { users: User[]; onChange: (users: User[]) => void }) {
  const [name, setName] = useState("");
  const addUser = () => {
    if (!name.trim()) return;
    onChange([{ id: makeId("user"), name: name.trim(), createdAt: now() }, ...users]);
    setName("");
  };
  const updateUser = (id: string, nextName: string) => {
    onChange(users.map((user) => (user.id === id ? { ...user, name: nextName } : user)));
  };

  return (
    <section className="panel form-panel">
      <h2>참여자 관리</h2>
      <div className="inline-form">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="새 참여자 이름" />
        <button className="primary" onClick={addUser} disabled={!name.trim()}>
          추가
        </button>
      </div>
      {users.length === 0 ? (
        <Empty text="참여자가 없어요. 먼저 함께 기록할 사람을 추가해 주세요." />
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <label key={user.id}>
              이름
              <input value={user.name} onChange={(event) => updateUser(user.id, event.target.value)} />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

function RecordItem({
  record,
  users,
  onDelete,
}: {
  record: UploadRecord;
  users: User[];
  onDelete?: (recordId: string) => void;
}) {
  const user = users.find((item) => item.id === record.userId);
  return (
    <article className="record-item">
      <div>
        <strong>{record.customTypeName || record.contentTypeName}</strong>
        <span>{user?.name ?? "알 수 없는 참여자"} · {record.platform || "기타"}</span>
        <small>{new Date(record.recordedAt).toLocaleDateString("ko-KR")}</small>
      </div>
      <div className="record-meta">
        <strong>{formatPoints(record.pointsEarned)}</strong>
        {record.url ? (
          <a href={record.url.startsWith("http") ? record.url : `https://${record.url}`} target="_blank" rel="noreferrer">
            URL
          </a>
        ) : (
          <span>URL 없음</span>
        )}
        {onDelete && <button onClick={() => onDelete(record.id)}>삭제</button>}
      </div>
      {record.memo && <p>{record.memo}</p>}
    </article>
  );
}

function RewardItem({ usage, users }: { usage: RewardUsage; users: User[] }) {
  const user = users.find((item) => item.id === usage.userId);
  return (
    <article className="record-item">
      <div>
        <strong>{usage.title}</strong>
        <span>{user?.name ?? "알 수 없는 참여자"} · {formatWon(usage.amount)}</span>
        <small>{new Date(usage.usedAt).toLocaleDateString("ko-KR")}</small>
      </div>
      <div className="record-meta">
        <strong>-{formatPoints(usage.pointsUsed)}</strong>
      </div>
      {usage.memo && <p>{usage.memo}</p>}
    </article>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "stat highlight" : "stat"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function Alert({ text }: { text: string }) {
  return <div className="alert">{text}</div>;
}
