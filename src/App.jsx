import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchUserState, upsertUserState } from './supabase.js'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Dumbbell,
  Gauge,
  GripVertical,
  ListTree,
  MessageCircleHeart,
  Moon,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import { initTokenClient, listLifeOsEvents, createCalendarEvent, deleteCalendarEvent } from './gcal.js'

const STORAGE_KEY = 'life-os-quest-state-v4'
const USER_STORAGE_PREFIX = 'life-game-user-state-v1'
const CURRENT_USER_KEY = 'life-game-current-user-v1'
const PROGRAM_START_DATE = new Date(2026, 5, 1)
const users = [
  { id: 'ck',    name: 'CK' },
  { id: 'ella',  name: 'Ella' },
  { id: 'mark',  name: 'Mark' },
  { id: 'sally', name: 'Sally' },
]

const userBadgeStyles = {
  CK: 'border-cyan-400 bg-cyan-500/15 text-cyan-200',
  Ella: 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200',
  Mark: 'border-amber-400 bg-amber-500/15 text-amber-200',
  Sally: 'border-emerald-400 bg-emerald-500/15 text-emerald-200',
}
const versionWeekOffsets = {
  v1: 0,
  v2: 8,
  v3: 16,
}

const copy = {
  en: {
    questBadge: '6-Month Growth Quest',
    currentLevel: 'Current Reward Level',
    highestLevel: 'Max level',
    quest: 'Quest',
    progress: 'Progress',
    diary: '일기',
    roadmap: 'Roadmap',
    diary: 'Diary',
    versionSelect: 'Chapter',
    weeklyRoadmap: 'Weekly Roadmap',
    weeks: '8 weeks',
    reset: 'Reset',
    resetTitle: 'Reset current week',
    weekComplete: 'Week Complete',
    selectedDay: 'Selected Day',
    rest: 'Rest',
    totalXp: 'Total XP',
    daySelect: 'Day Select',
    saturdayRest: 'Saturday is open for flexible planning.',
    todayRest: 'Full Rest Day',
    todayMissions: "Today's Missions",
    saturdayNoMissions: 'No missions on Saturday.',
    restNote: 'Use it for sleep, friends, walks, hobbies, or recovery. Rest is part of the program.',
    weekendMemo: 'Weekend Review Memo',
    weekendMemoHint: 'On Sunday, write what worked, what got stuck, and one promise for next week.',
    memoPlaceholder: 'Example: I completed workouts 3 times this week. Next week I will lock reading time at 9 PM.',
    dailyDiary: 'Daily Diary',
    dailyDiaryHint: 'Write a short note about today: what you did, how you felt, and one thing to remember.',
    dailyDiaryPlaceholder: 'Example: I read for 30 minutes and felt focused. Tomorrow I will start earlier.',
    toc: 'Table of Content',
    tocTitle: 'Build your life first, then build things',
    hide: 'Hide',
    show: 'Show',
    start: 'Life',
    create: 'World',
    independent: 'Build',
    activitySummary: 'Daily Focus',
    weekAtGlance: 'Week at a glance',
    fullRest: 'Full rest',
    progressTitle: 'Growth Progress',
    totalComplete: 'Total Complete',
    totalProgress: 'Total Progress',
    characterStatus: 'Character Status',
    overallPower: 'Overall',
    account: 'User',
    activeMember: 'Current User',
    weekPlanner: '1-Week Planner',
    activityPool: 'Activities to Schedule',
    dragHint: 'Drag activities into any day of the 1-week calendar.',
    resetPlan: 'Reset Plan',
    loadPreviousWeek: 'Load Previous Week Plan',
    planned: 'planned',
    remaining: 'remaining',
    dropHere: 'Drop here',
    monthlyProgress: 'Monthly Progress',
    curriculumCheck: '6-Month Curriculum Check',
    diaryBoard: 'Diary Board',
    weeklyDiary: 'Weekly Diary',
    monthlyDiary: 'Monthly Diary',
    noDiaryEntries: 'No diary entry yet.',
    missions: 'missions',
    month: 'Month',
    week: 'Week',
    untilXp: (xp, percent) => `${percent}% to ${xp} XP`,
  },
  ko: {
    questBadge: '6개월 성장 퀘스트',
    currentLevel: '현재 보상 레벨',
    highestLevel: '최고 레벨',
    quest: 'Quest',
    progress: 'Progress',
    roadmap: '로드맵',
    versionSelect: '챕터 선택',
    weeklyRoadmap: '주간 로드맵',
    weeks: '8주',
    reset: '초기화',
    resetTitle: '현재 주차 초기화',
    weekComplete: '이번 주 완료',
    selectedDay: '선택한 하루',
    rest: '휴식',
    totalXp: '총 XP',
    daySelect: '요일 선택',
    saturdayRest: '토요일은 XP 미션 없이 100% 휴식으로 비워두었습니다.',
    todayRest: '오늘은 완전 휴식일',
    todayMissions: '오늘의 미션',
    saturdayNoMissions: '토요일은 아무 미션도 없습니다.',
    restNote: '잠, 친구, 산책, 취미처럼 회복에만 사용하세요. 쉬는 것도 프로그램의 일부입니다.',
    weekendMemo: '주말 회고 메모',
    weekendMemoHint: '일요일 회고 때 이번 주에 잘한 점, 막힌 점, 다음 주 약속을 적어보세요.',
    memoPlaceholder: '예: 이번 주는 운동을 3번 완료했다. 다음 주에는 독서 시간을 저녁 9시로 고정한다.',
    dailyDiary: '간단한 일기',
    dailyDiaryHint: '오늘 한 일, 기분, 기억할 점 하나를 짧게 적어보세요.',
    dailyDiaryPlaceholder: '예: 오늘은 30분 독서를 했다. 내일은 조금 더 일찍 시작해보자.',
    toc: 'Table of Content',
    tocTitle: '먼저 생활을 세우고, 그 다음 만들어낸다',
    hide: '감추기',
    show: '보이기',
    start: '인생',
    create: '세상',
    independent: '표현',
    activitySummary: '요일별 주요 활동',
    weekAtGlance: '이번 주 한눈에 보기',
    fullRest: '완전 휴식',
    progressTitle: '성장 진행률',
    totalComplete: '전체 완료',
    totalProgress: '전체 진행률',
    characterStatus: '캐릭터 상태',
    overallPower: '종합',
    monthlyProgress: '월별 진행',
    curriculumCheck: '6개월 커리큘럼 체크',
    missions: '미션',
    month: 'Month',
    week: 'Week',
    untilXp: (xp, percent) => `${xp} XP까지 ${percent}%`,
  },
}

function tr(value, lang) {
  if (typeof value === 'string') return value
  return value?.[lang] ?? value?.en ?? ''
}

const versions = {
  v1: {
    label: 'V1',
    title: { en: 'Designing My Life', ko: '내 인생 설계하기' },
    months: { en: 'Months 1-2', ko: '1~2개월차' },
    theme: { en: 'Design everyday life and direction on your own terms.', ko: '생활과 삶의 방향을 스스로 설계하기' },
    weeks: [
      { en: 'Daily Life Strategy', ko: '생활 전략' },
      { en: 'Life Direction and Values', ko: '삶의 방향과 가치관' },
      { en: 'Money Management and Investment Philosophy', ko: '돈 관리와 투자 철학' },
      { en: 'Health and Workout Routine', ko: '건강과 운동 루틴' },
      { en: 'Relationships and Attitude', ko: '인간관계와 태도' },
      { en: 'Time Management and Habits', ko: '시간 관리와 습관' },
      { en: 'Personal Project Planning', ko: '개인 프로젝트 기획' },
      { en: 'Boss Battle 1: Life Manual', ko: '1차 보스전: 인생 매뉴얼' },
    ],
  },
  v2: {
    label: 'V2',
    title: { en: 'Understanding the World', ko: '세상 이해하기' },
    months: { en: 'Months 3-4', ko: '3~4개월차' },
    theme: { en: 'Build a basic map of how the world works.', ko: '세상이 어떻게 돌아가는지 기본 지도 만들기' },
    weeks: [
      { en: 'Economic Basics', ko: '경제 기초' },
      { en: 'Money and Capitalism', ko: '돈과 자본주의' },
      { en: 'Learning from History', ko: '역사에서 배우기' },
      { en: 'Politics and the State', ko: '정치와 국가' },
      { en: 'Social Problems and Inequality', ko: '사회 문제와 불평등' },
      { en: 'Reading News and Critical Thinking', ko: '뉴스 읽기와 비판적 사고' },
      { en: 'AI and Future Change', ko: 'AI와 미래 변화' },
      { en: 'Boss Battle 2: How Does the World Move?', ko: '2차 보스전: 세상은 어떻게 움직이는가?' },
    ],
  },
  v3: {
    label: 'V3',
    title: { en: 'Expressing and Building My Thinking', ko: '생각을 표현하고 만들기' },
    months: { en: 'Months 5-6', ko: '5~6개월차' },
    theme: { en: 'Express what you know through speaking, writing, code, and web pages.', ko: '아는 것을 말, 글, 코드, 웹페이지로 표현하기' },
    weeks: [
      { en: 'Writing and Logic', ko: '글쓰기와 논리' },
      { en: 'Presentation and Debate', ko: '발표와 토론' },
      { en: 'Using AI/Codex', ko: 'AI/Codex 활용' },
      { en: 'GitHub Basics', ko: 'GitHub 기본' },
      { en: 'Making a Web Page', ko: '웹페이지 만들기' },
      { en: 'Economic News Analysis', ko: '경제 뉴스 분석' },
      { en: 'Politics and Social Issue Analysis', ko: '정치·사회 이슈 분석' },
      { en: 'Final Boss Battle: Publish My Thinking to the World', ko: '최종 보스전: 내 생각을 세상에 공개하기' },
    ],
  },
}

const curriculum = [
  {
    month: 1,
    version: 'v1',
    startWeek: 1,
    title: { en: 'Designing My Life I', ko: '내 인생 설계하기 I' },
    goal: { en: 'Start designing everyday life and direction', ko: '생활과 삶의 방향을 스스로 설계하기' },
    statFocus: ['leadership', 'vitality', 'intelligence'],
    topics: [
      { en: 'Daily Life Strategy', ko: '생활 전략' },
      { en: 'Life Direction', ko: '삶의 방향' },
      { en: 'Money Philosophy', ko: '돈 관리와 투자 철학' },
      { en: 'Health Routine', ko: '건강과 운동 루틴' },
    ],
  },
  {
    month: 2,
    version: 'v1',
    startWeek: 5,
    title: { en: 'Designing My Life II', ko: '내 인생 설계하기 II' },
    goal: { en: 'Turn life design into a personal manual', ko: '인생 설계를 나만의 매뉴얼로 정리하기' },
    statFocus: ['charisma', 'leadership', 'creativity'],
    topics: [
      { en: 'Relationships', ko: '인간관계와 태도' },
      { en: 'Habits', ko: '시간 관리와 습관' },
      { en: 'Project Plan', ko: '개인 프로젝트 기획' },
      { en: 'Boss Battle 1', ko: '1차 보스전' },
    ],
  },
  {
    month: 3,
    version: 'v2',
    startWeek: 1,
    title: { en: 'Understanding the World I', ko: '세상 이해하기 I' },
    goal: { en: 'Build the first half of a world map', ko: '세상의 기본 지도를 만들기' },
    statFocus: ['intelligence', 'leadership'],
    topics: [
      { en: 'Economics', ko: '경제 기초' },
      { en: 'Capitalism', ko: '돈과 자본주의' },
      { en: 'History', ko: '역사에서 배우기' },
      { en: 'Politics', ko: '정치와 국가' },
    ],
  },
  {
    month: 4,
    version: 'v2',
    startWeek: 5,
    title: { en: 'Understanding the World II', ko: '세상 이해하기 II' },
    goal: { en: 'Explain how the world moves', ko: '세상이 어떻게 움직이는지 설명하기' },
    statFocus: ['intelligence', 'creativity', 'charisma'],
    topics: [
      { en: 'Inequality', ko: '사회 문제와 불평등' },
      { en: 'Critical News', ko: '뉴스 읽기와 비판적 사고' },
      { en: 'AI Future', ko: 'AI와 미래 변화' },
      { en: 'Boss Battle 2', ko: '2차 보스전' },
    ],
  },
  {
    month: 5,
    version: 'v3',
    startWeek: 1,
    title: { en: 'Expressing and Building I', ko: '생각을 표현하고 만들기 I' },
    goal: { en: 'Express ideas through words, discussion, and tools', ko: '말, 글, 도구로 생각을 표현하기' },
    statFocus: ['creativity', 'charisma', 'intelligence'],
    topics: [
      { en: 'Writing', ko: '글쓰기와 논리' },
      { en: 'Presentation', ko: '발표와 토론' },
      { en: 'AI/Codex', ko: 'AI/Codex 활용' },
      { en: 'GitHub', ko: 'GitHub 기본' },
    ],
  },
  {
    month: 6,
    version: 'v3',
    startWeek: 5,
    title: { en: 'Expressing and Building II', ko: '생각을 표현하고 만들기 II' },
    goal: { en: 'Publish my thinking to the world', ko: '내 생각을 세상에 공개하기' },
    statFocus: ['creativity', 'intelligence', 'leadership'],
    topics: [
      { en: 'Web Page', ko: '웹페이지 만들기' },
      { en: 'Economic News', ko: '경제 뉴스 분석' },
      { en: 'Social Issues', ko: '정치·사회 이슈 분석' },
      { en: 'Final Boss', ko: '최종 보스전' },
    ],
  },
]

const characterStats = [
  {
    id: 'intelligence',
    label: { en: 'Intelligence', ko: '지력' },
    short: { en: 'World understanding and judgment', ko: '세상 이해와 판단력' },
    detail: {
      en: 'Understand the world, think logically, read deeply, and make better judgments.',
      ko: '세상을 이해하고, 논리적으로 생각하며, 깊게 읽고 좋은 판단을 내리는 힘입니다.',
    },
    examples: {
      en: 'Reading, economics, history, politics, news analysis',
      ko: '독서, 경제, 역사, 정치, 뉴스 분석',
    },
    color: 'from-sky-400 to-cyan-300',
  },
  {
    id: 'charisma',
    label: { en: 'Charisma', ko: '매력' },
    short: { en: 'Communication and trust', ko: '소통과 신뢰' },
    detail: {
      en: 'Communicate clearly, listen well, show respect, and build trust.',
      ko: '잘 말하고, 잘 듣고, 존중을 보여주며 신뢰를 만드는 힘입니다.',
    },
    examples: {
      en: 'Family talk, questions, gratitude, speech, attitude reflection',
      ko: '가족 대화, 질문, 감사, 발표, 태도 회고',
    },
    color: 'from-pink-400 to-fuchsia-400',
  },
  {
    id: 'vitality',
    label: { en: 'Vitality', ko: '체력' },
    short: { en: 'Physical and mental energy', ko: '몸과 마음의 에너지' },
    detail: {
      en: 'Keep enough physical and mental energy to study, work, and live well.',
      ko: '공부하고 일하고 잘 살아갈 수 있는 몸과 마음의 에너지입니다.',
    },
    examples: {
      en: 'Workout, walking, stretching, sleep routine, stress management',
      ko: '운동, 걷기, 스트레칭, 수면 루틴, 스트레스 관리',
    },
    color: 'from-emerald-400 to-teal-300',
  },
  {
    id: 'creativity',
    label: { en: 'Creativity', ko: '창의력' },
    short: { en: 'Making ideas real', ko: '생각을 결과물로 만들기' },
    detail: {
      en: 'Create from ideas through writing, coding, AI, presentation, and projects.',
      ko: '글쓰기, 코딩, AI, 발표, 프로젝트로 생각을 결과물로 만드는 힘입니다.',
    },
    examples: {
      en: 'Codex, GitHub, Vercel, writing, presentation, project design',
      ko: 'Codex, GitHub, Vercel, 글쓰기, 발표, 프로젝트 설계',
    },
    color: 'from-violet-400 to-indigo-400',
  },
  {
    id: 'leadership',
    label: { en: 'Leadership', ko: '리더십' },
    short: { en: 'Leading your own life', ko: '내 삶을 이끄는 힘' },
    detail: {
      en: 'Plan, decide, manage time and money, take responsibility, and choose direction.',
      ko: '계획하고 결정하며 시간과 돈을 관리하고 삶의 방향을 선택하는 힘입니다.',
    },
    examples: {
      en: 'Planning, spending record, weekly review, life reflection',
      ko: '계획, 지출 기록, 주간 회고, 삶의 방향 성찰',
    },
    color: 'from-amber-400 to-orange-400',
  },
]

const statMap = Object.fromEntries(characterStats.map((stat) => [stat.id, stat]))

const missions = [
  {
    id: 'parent-talk',
    name: 'Family Talk',
    ko: { en: 'Family Talk', ko: '가족 대화' },
    xp: 30,
    statRewards: { intelligence: 5, charisma: 5 },
    icon: MessageCircleHeart,
    tone: 'bg-rose-50 text-rose-700 border-rose-100',
    detail: { en: 'Share your goals, condition, and needed support with family for 30-60 minutes', ko: '가족과 내가 정한 목표, 컨디션, 필요한 도움을 30-60분 나누기' },
  },
  {
    id: 'reading',
    name: 'Reading',
    ko: { en: 'Reading', ko: '독서' },
    xp: 20,
    statRewards: { intelligence: 10 },
    icon: BookOpen,
    tone: 'bg-sky-50 text-sky-700 border-sky-100',
    detail: { en: 'Read for 30-45 minutes and capture one key sentence', ko: '30-45분 읽고 핵심 문장 하나 남기기' },
  },
  {
    id: 'workout',
    name: 'Workout',
    ko: { en: 'Workout', ko: '운동' },
    xp: 20,
    statRewards: { vitality: 10 },
    icon: Dumbbell,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    detail: { en: 'Choose 30-45 minutes of walking, strength, or stretching', ko: '30-45분 걷기, 근력, 스트레칭 중 선택' },
  },
  {
    id: 'ai-coding',
    name: 'AI/Coding',
    ko: { en: 'AI/Coding', ko: 'AI/코딩' },
    xp: 25,
    statRewards: { creativity: 10 },
    icon: Bot,
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
    detail: { en: 'Spend 45-75 minutes building, experimenting, or debugging', ko: '45-75분 만들기, 실험, 디버깅 중 하나 완료' },
  },
  {
    id: 'memo',
    name: 'Memo',
    ko: { en: 'Memo', ko: '메모' },
    xp: 15,
    statRewards: { leadership: 5, intelligence: 3 },
    icon: NotebookPen,
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
    detail: { en: 'Organize thoughts for 10-20 minutes and write 3 learning notes', ko: '10-20분 생각 정리, 배운 점 3줄 기록' },
  },
  {
    id: 'weekend-review',
    name: 'Weekend Review',
    ko: { en: 'Weekend Review', ko: '주말 회고' },
    xp: 50,
    statRewards: { leadership: 12 },
    icon: CalendarCheck,
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    detail: { en: 'Spend 60 minutes reviewing wins, blockers, and next week commitments', ko: '60분 동안 이번 주 성과, 문제, 다음 주 약속 정리' },
  },
]

const missionMap = Object.fromEntries(missions.filter((mission) => mission.id !== 'memo').map((mission) => [mission.id, mission]))

const days = [
  {
    id: 'mon',
    label: { en: 'Mon', ko: '월' },
    title: { en: 'Routine Start', ko: '루틴 시작' },
    personalTime: { en: 'Personal 90 min', ko: '개인 90분' },
    parentTime: { en: 'Family 30 min', ko: '가족 30분' },
  },
  {
    id: 'tue',
    label: { en: 'Tue', ko: '화' },
    title: { en: 'Focus Training', ko: '집중 훈련' },
    personalTime: { en: 'Personal 90-120 min', ko: '개인 90-120분' },
    parentTime: { en: 'Family 30 min', ko: '가족 30분' },
  },
  {
    id: 'wed',
    label: { en: 'Wed', ko: '수' },
    title: { en: 'Midweek Check', ko: '중간 점검' },
    personalTime: { en: 'Personal 90 min', ko: '개인 90분' },
    parentTime: { en: 'Family 45 min', ko: '가족 45분' },
  },
  {
    id: 'thu',
    label: { en: 'Thu', ko: '목' },
    title: { en: 'Execution Boost', ko: '실행 강화' },
    personalTime: { en: 'Personal 90-120 min', ko: '개인 90-120분' },
    parentTime: { en: 'Family 30 min', ko: '가족 30분' },
  },
  {
    id: 'fri',
    label: { en: 'Fri', ko: '금' },
    title: { en: 'Light Closeout', ko: '가볍게 마감' },
    personalTime: { en: 'Personal 75-90 min', ko: '개인 75-90분' },
    parentTime: { en: 'Family 30 min', ko: '가족 30분' },
  },
  {
    id: 'sat',
    label: { en: 'Sat', ko: '\uD1A0' },
    title: { en: 'Flexible Day', ko: '\uC790\uC728 \uACC4\uD68D' },
    personalTime: { en: 'Flexible personal missions', ko: '\uAC1C\uC778 \uBBF8\uC158 \uC790\uC728' },
    parentTime: { en: 'Flexible family time', ko: '\uAC00\uC871 \uC2DC\uAC04 \uC790\uC728' },
  },
  {
    id: 'sun',
    label: { en: 'Sun', ko: '일' },
    title: { en: 'Review and Reset', ko: '회고와 리셋' },
    personalTime: { en: 'Personal 60-90 min', ko: '개인 60-90분' },
    parentTime: { en: 'Family 60 min', ko: '가족 60분' },
  },
]

const weeklyMissionPlans = {
  v1: {
    lifeDesign: {
      mon: ['reading', 'workout', 'parent-talk'],
      tue: ['reading'],
      wed: ['reading', 'workout', 'parent-talk'],
      thu: ['reading'],
      fri: ['reading', 'workout', 'parent-talk'],
      sun: ['weekend-review', 'workout', 'parent-talk'],
    },
    lifeManual: {
      mon: ['reading', 'workout', 'parent-talk'],
      tue: ['reading'],
      wed: ['reading', 'workout', 'parent-talk'],
      thu: ['reading'],
      fri: ['reading', 'workout', 'parent-talk'],
      sun: ['weekend-review', 'workout', 'parent-talk'],
    },
  },
  v2: {
    worldMap: {
      mon: ['reading', 'workout', 'parent-talk'],
      tue: ['reading'],
      wed: ['reading', 'workout', 'parent-talk'],
      thu: ['reading'],
      fri: ['reading', 'workout', 'parent-talk'],
      sun: ['weekend-review', 'workout', 'parent-talk'],
    },
  },
  v3: {
    expression: {
      mon: ['reading', 'workout', 'parent-talk'],
      tue: ['reading', 'ai-coding'],
      wed: ['reading', 'workout', 'parent-talk'],
      thu: ['reading', 'ai-coding'],
      fri: ['reading', 'workout', 'parent-talk'],
      sun: ['weekend-review', 'workout', 'parent-talk'],
    },
  },
}

const dayPlanTemplates = {
  v1: {
    mon: {
      en: 'Map the key question for this week and choose one area to design for your future self.',
      ko: '이번 주 핵심 질문을 정하고, 미래의 나를 위해 설계할 영역 하나를 고릅니다.',
    },
    tue: {
      en: 'Read or research the topic, then collect 3 ideas worth keeping.',
      ko: '주제와 관련된 글이나 자료를 읽고, 남길 만한 아이디어 3개를 모읍니다.',
    },
    wed: {
      en: 'Turn the ideas into personal rules, habits, or decision principles.',
      ko: '모은 아이디어를 나만의 규칙, 습관, 판단 기준으로 바꿉니다.',
    },
    thu: {
      en: 'Test the idea in daily life and talk through what support you need.',
      ko: '그 아이디어를 하루 생활에 작게 실험하고 필요한 도움을 이야기합니다.',
    },
    fri: {
      en: 'Write one page for the life manual and choose a next action.',
      ko: '인생 매뉴얼에 들어갈 한 페이지를 쓰고 다음 행동 하나를 정합니다.',
    },
    sun: {
      en: 'Review the week and add the best insight to your life manual.',
      ko: '한 주를 회고하고 가장 좋은 깨달음을 인생 매뉴얼에 추가합니다.',
    },
  },
  v2: {
    mon: {
      en: 'Define the world question for this week and list what you already think.',
      ko: '이번 주 세상 질문을 정하고 내가 이미 생각하는 것을 적습니다.',
    },
    tue: {
      en: 'Read one clear source and separate facts, opinions, and unknowns.',
      ko: '자료 하나를 읽고 사실, 의견, 모르는 점을 구분합니다.',
    },
    wed: {
      en: 'Find one real example from news, history, or daily life.',
      ko: '뉴스, 역사, 일상에서 실제 사례 하나를 찾습니다.',
    },
    thu: {
      en: 'Compare two viewpoints and write what each side sees well.',
      ko: '두 관점을 비교하고 각 입장이 잘 보는 지점을 씁니다.',
    },
    fri: {
      en: 'Make a simple map of how the system works.',
      ko: '그 시스템이 어떻게 움직이는지 간단한 지도로 정리합니다.',
    },
    sun: {
      en: 'Review the week and refine your answer to the world question.',
      ko: '한 주를 회고하고 세상 질문에 대한 답을 다듬습니다.',
    },
  },
  v3: {
    mon: {
      en: 'Choose the idea you want to express and define the audience.',
      ko: '표현할 생각 하나를 고르고 누구에게 보여줄지 정합니다.',
    },
    tue: {
      en: 'Draft the argument, outline, or prototype with AI/Codex support if useful.',
      ko: '필요하면 AI/Codex를 활용해 주장, 개요, 프로토타입 초안을 만듭니다.',
    },
    wed: {
      en: 'Improve the structure and check whether the message is clear.',
      ko: '구조를 다듬고 메시지가 분명한지 점검합니다.',
    },
    thu: {
      en: 'Build, rehearse, or revise the output until it can be shown.',
      ko: '보여줄 수 있는 수준이 될 때까지 만들고, 연습하고, 수정합니다.',
    },
    fri: {
      en: 'Polish the final version and prepare a short public explanation.',
      ko: '최종본을 다듬고 공개할 때 쓸 짧은 설명을 준비합니다.',
    },
    sun: {
      en: 'Review feedback and decide what to publish or improve next.',
      ko: '피드백을 돌아보고 무엇을 공개하거나 개선할지 정합니다.',
    },
  },
}

const levels = [
  { name: { en: 'Lv.1 Seed Adventurer', ko: 'Lv.1 새싹 모험가' }, min: 0 },
  { name: { en: 'Lv.2 Routine Apprentice', ko: 'Lv.2 루틴 견습생' }, min: 250 },
  { name: { en: 'Lv.3 Focus Warrior', ko: 'Lv.3 집중 전사' }, min: 550 },
  { name: { en: 'Lv.4 Creator', ko: 'Lv.4 크리에이터' }, min: 900 },
  { name: { en: 'Lv.5 Independent Operator', ko: 'Lv.5 독립 실행자' }, min: 1300 },
  { name: { en: 'Lv.6 Life-Ready Master', ko: 'Lv.6 생활 설계 마스터' }, min: 1800 },
]

const createDefaultState = () => {
  const { version, week, dayId } = getTodayVersionWeekDay()
  return {
    selectedVersion: version,
    selectedWeek: week,
    selectedDay: dayId,
    activeTab: 'quest',
    diaryView: 'week',
    lang: 'en',
    showToc: true,
    completed: {},
    memos: {},
    schedules: {},
  }
}

function getUserStorageKey(userId) {
  return `${USER_STORAGE_PREFIX}:${userId}`
}

function loadCurrentUserId() {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY)
    const userId = saved ? JSON.parse(saved) : users[0].id
    return users.some((user) => user.id === userId) ? userId : users[0].id
  } catch {
    return users[0].id
  }
}

function saveCurrentUserId(userId) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userId))
}

function loadState(userId) {
  try {
    const userKey = getUserStorageKey(userId)
    const saved = localStorage.getItem(userKey)
    if (!saved && userId === users[0].id) {
      const legacyState = localStorage.getItem(STORAGE_KEY)
      if (legacyState) {
        localStorage.setItem(userKey, legacyState)
        return migrateState({ ...createDefaultState(), ...JSON.parse(legacyState) })
      }
    }
    return saved ? migrateState({ ...createDefaultState(), ...JSON.parse(saved) }) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

function migrateState(state) {
  if (state.schedules && Object.keys(state.schedules).length > 0) return state
  const schedules = {}

  Object.entries(state.completed ?? {}).forEach(([key, done]) => {
    if (!done) return
    const [version, weekPart, dayId, missionId] = key.split('|')
    const week = Number(weekPart?.replace('w', ''))
    if (!version || !week || !dayId || !missionId) return
    const scheduleKey = getScheduleKey(version, week)
    if (!schedules[scheduleKey]) schedules[scheduleKey] = Object.fromEntries(days.map((day) => [day.id, []]))
    if (!schedules[scheduleKey][dayId]?.includes(missionId)) {
      schedules[scheduleKey][dayId] = [...(schedules[scheduleKey][dayId] ?? []), missionId]
    }
  })

  return { ...state, schedules }
}

function getMissionKey(version, week, day, missionId) {
  return `${version}|w${week}|${day}|${missionId}`
}

function getMemoKey(version, week) {
  return `${version}|w${week}|weekend-review`
}

function getDailyMemoKey(version, week, dayId) {
  return `${version}|w${week}|${dayId}|daily-diary`
}

function getScheduleKey(version, week) {
  return `${version}|w${week}`
}

function getPreviousWeekRef(version, week) {
  if (week > 1) return { version, week: week - 1 }
  const versionKeys = Object.keys(versions)
  const versionIndex = versionKeys.indexOf(version)
  if (versionIndex <= 0) return null
  return { version: versionKeys[versionIndex - 1], week: 8 }
}

function getWeekPlan(version, week) {
  if (version === 'v1') {
    if (week <= 4) return weeklyMissionPlans.v1.lifeDesign
    return weeklyMissionPlans.v1.lifeManual
  }

  if (version === 'v2') return weeklyMissionPlans.v2.worldMap
  return weeklyMissionPlans.v3.expression
}

function getDefaultWeekSchedule(version, week) {
  const plan = getWeekPlan(version, week)
  return Object.fromEntries(days.map((day) => [day.id, day.rest ? [] : [...(plan[day.id] ?? [])]]))
}

function getWeekSchedule(schedules, version, week) {
  if (!schedules) return getDefaultWeekSchedule(version, week)
  const savedSchedule = schedules[getScheduleKey(version, week)] ?? Object.fromEntries(days.map((day) => [day.id, []]))
  return sanitizeWeekSchedule(savedSchedule, version, week)
}

function sanitizeWeekSchedule(schedule, version, week) {
  const requiredCounts = countMissionIds(Object.values(getDefaultWeekSchedule(version, week)).flat())
  const scheduledCounts = {}
  const nextSchedule = Object.fromEntries(days.map((day) => [day.id, []]))

  days.forEach((day) => {
    if (day.rest) return
    ;(schedule[day.id] ?? []).forEach((missionId) => {
      if (missionId === 'memo' || missionId === 'weekend-review') return
      const required = requiredCounts[missionId] ?? 0
      const scheduled = scheduledCounts[missionId] ?? 0
      if (required > 0 && scheduled < required) {
        nextSchedule[day.id].push(missionId)
        scheduledCounts[missionId] = scheduled + 1
      }
    })
  })

  nextSchedule.sun = [...nextSchedule.sun.filter((missionId) => missionId !== 'weekend-review'), 'weekend-review']
  return nextSchedule
}

function countMissionIds(missionIds) {
  return missionIds.reduce((counts, missionId) => {
    counts[missionId] = (counts[missionId] ?? 0) + 1
    return counts
  }, {})
}

function getMissionIdsForDay(version, week, day, schedules) {
  if (day.rest) return []
  return getWeekSchedule(schedules, version, week)[day.id] ?? []
}

function getDayMissions(version, week, day, schedules) {
  return getMissionIdsForDay(version, week, day, schedules).map((id) => {
    if (id === 'workout' && day.id === 'sun') {
      return {
        ...missionMap[id],
        name: 'Family Workout',
        ko: { en: 'Family Workout', ko: '가족 운동' },
        detail: {
          en: 'Move together as a family: walk, hike, swim, stretch, or play a sport',
          ko: '가족과 함께 걷기, 등산, 수영, 스트레칭, 스포츠 중 하나를 합니다',
        },
      }
    }

    return missionMap[id]
  })
}

function getDayPlan(version, day) {
  if (day.rest) {
    return {
      en: 'No plan today. Protect recovery time.',
      ko: '오늘은 계획이 없습니다. 회복 시간을 지킵니다.',
    }
  }

  return dayPlanTemplates[version]?.[day.id] ?? dayPlanTemplates.v1.mon
}

function addDays(date, daysToAdd) {
  const next = new Date(date)
  next.setDate(next.getDate() + daysToAdd)
  return next
}

function getAbsoluteWeek(version, week) {
  return versionWeekOffsets[version] + week
}

function getTodayVersionWeekDay() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today - PROGRAM_START_DATE) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { version: 'v1', week: 1, dayId: 'mon' }
  const totalWeeks = Math.floor(diffDays / 7)
  const dayIndex = Math.min(diffDays % 7, days.length - 1)
  const dayId = days[dayIndex]?.id ?? 'mon'
  const versionKeys = Object.keys(versions)
  for (const vk of versionKeys) {
    const offset = versionWeekOffsets[vk]
    if (totalWeeks >= offset && totalWeeks < offset + 8) {
      return { version: vk, week: totalWeeks - offset + 1, dayId }
    }
  }
  // After program end, stay on last week
  return { version: 'v3', week: 8, dayId: 'mon' }
}

function getNextVersionWeek(version, week) {
  if (week < 8) return { version, week: week + 1 }
  const vks = Object.keys(versions)
  const idx = vks.indexOf(version)
  if (idx < vks.length - 1) return { version: vks[idx + 1], week: 1 }
  return null
}

function getPrevVersionWeek(version, week) {
  if (week > 1) return { version, week: week - 1 }
  const vks = Object.keys(versions)
  const idx = vks.indexOf(version)
  if (idx > 0) return { version: vks[idx - 1], week: 8 }
  return null
}

function getWeekStartDate(version, week) {
  return addDays(PROGRAM_START_DATE, (getAbsoluteWeek(version, week) - 1) * 7)
}

function getDayDate(version, week, dayId) {
  const dayIndex = days.findIndex((day) => day.id === dayId)
  return addDays(getWeekStartDate(version, week), Math.max(dayIndex, 0))
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)}-${formatDate(endDate)}`
}

function getMonthDateRange(item) {
  const startDate = getWeekStartDate(item.version, item.startWeek)
  const endDate = addDays(startDate, 27)
  return formatDateRange(startDate, endDate)
}

function getWeekStats(completed, version, week) {
  const total = days.reduce((sum, day) => sum + getMissionIdsForDay(version, week, day).length, 0)
  const done = days.reduce((sum, day) => {
    const missionIds = getMissionIdsForDay(version, week, day)
    return sum + missionIds.filter((missionId) => completed[getMissionKey(version, week, day.id, missionId)]).length
  }, 0)

  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
  }
}

function getVersionStats(completed, version) {
  const weeks = versions[version].weeks.map((_, index) => getWeekStats(completed, version, index + 1))
  const done = weeks.reduce((sum, week) => sum + week.done, 0)
  const total = weeks.reduce((sum, week) => sum + week.total, 0)

  return {
    done,
    total,
    weeks,
    percent: total ? Math.round((done / total) * 100) : 0,
  }
}

function getMonthStats(completed, item) {
  const weeks = [0, 1, 2, 3].map((offset) => getWeekStats(completed, item.version, item.startWeek + offset))
  const done = weeks.reduce((sum, week) => sum + week.done, 0)
  const total = weeks.reduce((sum, week) => sum + week.total, 0)

  return {
    done,
    total,
    weeks,
    percent: total ? Math.round((done / total) * 100) : 0,
  }
}

function getStatTotals(completed) {
  const totals = Object.fromEntries(characterStats.map((stat) => [stat.id, 0]))

  Object.entries(completed).forEach(([key, done]) => {
    if (!done) return
    const missionId = key.split('|').at(-1)
    const rewards = missionMap[missionId]?.statRewards ?? {}
    Object.entries(rewards).forEach(([statId, points]) => {
      totals[statId] = (totals[statId] ?? 0) + points
    })
  })

  return totals
}

function getMaxStatTotals() {
  const totals = Object.fromEntries(characterStats.map((stat) => [stat.id, 0]))

  Object.keys(versions).forEach((versionKey) => {
    versions[versionKey].weeks.forEach((_, index) => {
      const week = index + 1
      days.forEach((day) => {
        getMissionIdsForDay(versionKey, week, day).forEach((missionId) => {
          const rewards = missionMap[missionId]?.statRewards ?? {}
          Object.entries(rewards).forEach(([statId, points]) => {
            totals[statId] = (totals[statId] ?? 0) + points
          })
        })
      })
    })
  })

  return totals
}

function getStatLevel(points) {
  return `Lv.${Math.floor(points / 50) + 1}`
}

function getStatPercent(points) {
  return Math.min(100, Math.round(((points % 50) / 50) * 100))
}

function getOverallPower(statTotals) {
  return characterStats.reduce((sum, stat) => sum + (statTotals[stat.id] ?? 0), 0)
}

function getOverallPercent(statTotals, maxStatTotals) {
  const total = getOverallPower(statTotals)
  const maxTotal = getOverallPower(maxStatTotals)
  return maxTotal ? Math.round((total / maxTotal) * 100) : 0
}

function getFixedChartAxisMax() {
  const maxStatTotals = getMaxStatTotals()
  const rawMax = Math.max(...Object.values(maxStatTotals), 1)
  return Math.ceil(rawMax / 10) * 10
}

function getPlannedWeekStatPoints(version, week) {
  const totals = Object.fromEntries(characterStats.map((stat) => [stat.id, 0]))

  days.forEach((day) => {
    getMissionIdsForDay(version, week, day).forEach((missionId) => {
      const rewards = missionMap[missionId]?.statRewards ?? {}
      Object.entries(rewards).forEach(([statId, points]) => {
        totals[statId] = (totals[statId] ?? 0) + points
      })
    })
  })

  return totals
}

function getWeeklyChartAxisMax() {
  const rawMax = Math.max(
    ...Object.keys(versions).flatMap((versionKey) =>
      versions[versionKey].weeks.flatMap((_, index) =>
        Object.values(getPlannedWeekStatPoints(versionKey, index + 1))
      )
    ),
    1,
  )

  return Math.ceil(rawMax / 10) * 10
}

function getMonthlyChartAxisMax() {
  const monthDefs = [
    { version: 'v1', startWeek: 1 }, { version: 'v1', startWeek: 5 },
    { version: 'v2', startWeek: 1 }, { version: 'v2', startWeek: 5 },
    { version: 'v3', startWeek: 1 }, { version: 'v3', startWeek: 5 },
  ]

  const rawMax = Math.max(
    ...monthDefs.flatMap(({ version, startWeek }) => {
      const totals = Object.fromEntries(characterStats.map((stat) => [stat.id, 0]))

      for (let w = startWeek; w < startWeek + 4; w++) {
        const weekTotals = getPlannedWeekStatPoints(version, w)
        Object.entries(weekTotals).forEach(([statId, points]) => {
          totals[statId] = (totals[statId] ?? 0) + points
        })
      }

      return Object.values(totals)
    }),
    1,
  )

  return Math.ceil(rawMax / 10) * 10
}

function getDayScheduleSummary(allUsersData, version, week, dayId) {
  const missionUsers = {}

  allUsersData?.forEach(({ user, state }) => {
    const userSchedule = getWeekSchedule(state?.schedules, version, week)
    const missionIds = userSchedule?.[dayId] ?? []

    missionIds.forEach((missionId) => {
      if (!missionMap[missionId]) return
      if (!missionUsers[missionId]) missionUsers[missionId] = []
      missionUsers[missionId].push(user.name)
    })
  })

  return Object.entries(missionUsers)
    .map(([missionId, names]) => ({ missionId, names }))
    .sort((a, b) => a.missionId.localeCompare(b.missionId))
}

function getNextDayRef(version, week, dayId) {
  const dayIndex = days.findIndex((day) => day.id === dayId)
  if (dayIndex >= 0 && dayIndex < days.length - 1) {
    return { version, week, dayId: days[dayIndex + 1].id }
  }

  const nextWeek = getNextVersionWeek(version, week)
  if (!nextWeek) return { version, week, dayId }
  return { version: nextWeek.version, week: nextWeek.week, dayId: 'mon' }
}

function formatLongDate(date, lang) {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'en-GB' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getMonthBlockStartWeek(week) {
  return week <= 4 ? 1 : 5
}

function getDiaryEntry(memos, version, week, dayId) {
  const key = dayId === 'sun' ? getMemoKey(version, week) : getDailyMemoKey(version, week, dayId)
  return (memos?.[key] ?? '').trim()
}

function getWeekDiaryEntries(memos, version, week) {
  return days.map((day) => ({
    ...day,
    date: getDayDate(version, week, day.id),
    text: getDiaryEntry(memos, version, week, day.id),
  }))
}

function getMonthDiaryEntries(memos, version, selectedWeek) {
  const startWeek = getMonthBlockStartWeek(selectedWeek)
  return Array.from({ length: 4 }, (_, weekOffset) => {
    const week = startWeek + weekOffset
    return {
      week,
      entries: getWeekDiaryEntries(memos, version, week),
    }
  })
}

function getDiaryPreview(text) {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim()
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function App() {
  const [currentUserId, setCurrentUserId] = useState(loadCurrentUserId)
  const [state, setState] = useState(createDefaultState)
  const [isLoading, setIsLoading] = useState(true)
  const [allUsersData, setAllUsersData] = useState(null)
  const [progressUserId, setProgressUserId] = useState(null)
  const [gToken, setGToken] = useState(null)
  const [calSyncing, setCalSyncing] = useState(false)
  const [calSynced, setCalSynced] = useState(false)
  const saveTimerRef = useRef(null)
  const gTokenClientRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const lang = state.lang ?? 'en'
  const c = copy[lang]
  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0]

  const syncCalendar = useCallback(async (token, usersData, currentLang) => {
    if (!token || !usersData) return
    setCalSyncing(true)
    setCalSynced(false)
    try {
      const today = getTodayVersionWeekDay()
      const tomorrow = getNextDayRef(today.version, today.week, today.dayId)
      const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const targets = [
        { ref: today, dateStr: toDateStr(new Date()) },
        { ref: tomorrow, dateStr: toDateStr(addDays(new Date(), 1)) },
      ]
      for (const { ref, dateStr } of targets) {
        const dayObj = days.find((d) => d.id === ref.dayId)
        if (!dayObj) continue
        const missionUsers = {}
        usersData.forEach(({ user, state: us }) => {
          (us.schedules?.[`${ref.version}|w${ref.week}`]?.[ref.dayId] ?? getMissionIdsForDay(ref.version, ref.week, dayObj, us.schedules)).forEach((missionId) => {
            if (!missionUsers[missionId]) missionUsers[missionId] = []
            missionUsers[missionId].push(user.name)
          })
        })
        const existing = await listLifeOsEvents(token, dateStr)
        await Promise.all(existing.map((ev) => deleteCalendarEvent(token, ev.id)))
        for (const [missionId, userNames] of Object.entries(missionUsers)) {
          const mission = missionMap[missionId]
          if (!mission) continue
          await createCalendarEvent(token, {
            date: dateStr,
            missionId,
            missionName: tr(mission.ko, currentLang),
            detail: tr(mission.detail, currentLang),
            userNames,
            xp: mission.xp,
          })
        }
      }
      setCalSynced(true)
    } catch (err) {
      console.error('Calendar sync failed', err)
    } finally {
      setCalSyncing(false)
    }
  }, [])

  const hasSyncedRef = useRef(false)
  const connectGoogleCalendar = useCallback(async () => {
    if (!clientId) return
    try {
      await loadGoogleIdentityScript()
      if (!gTokenClientRef.current) {
        gTokenClientRef.current = initTokenClient(clientId, (res) => {
          if (res.access_token) setGToken(res.access_token)
        })
      }
      gTokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    } catch (err) {
      console.error('Google Calendar connect failed', err)
    }
  }, [clientId])

  useEffect(() => {
    if (gToken && allUsersData && !hasSyncedRef.current) {
      hasSyncedRef.current = true
      syncCalendar(gToken, allUsersData, lang)
    }
  }, [gToken, allUsersData])

  useEffect(() => {
    setIsLoading(true)
    fetchUserState(currentUserId)
      .then((remoteState) => {
        const today = getTodayVersionWeekDay()
        if (remoteState) {
          setState(migrateState({ ...createDefaultState(), ...remoteState, ...today }))
        } else {
          const localState = loadState(currentUserId)
          const merged = { ...localState, ...today }
          setState(merged)
          upsertUserState(currentUserId, merged).catch(console.error)
        }
      })
      .catch(() => {
        setState({ ...loadState(currentUserId), ...getTodayVersionWeekDay() })
      })
      .finally(() => setIsLoading(false))
  }, [currentUserId])

  useEffect(() => {
    if (isLoading) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      upsertUserState(currentUserId, state).catch(console.error)
    }, 1000)
  }, [currentUserId, state, isLoading])

  useEffect(() => {
    document.documentElement.lang = lang === 'ko' ? 'ko' : 'en'
  }, [lang])

  useEffect(() => {
    Promise.all(
      users.map((user) =>
        fetchUserState(user.id)
          .then((s) => ({ user, state: s ? migrateState({ ...createDefaultState(), ...s }) : createDefaultState() }))
          .catch(() => ({ user, state: createDefaultState() }))
      )
    ).then(setAllUsersData)
  }, [currentUserId, state.schedules])

  const switchUser = (userId) => {
    saveCurrentUserId(userId)
    setCurrentUserId(userId)
  }

  const totalXp = useMemo(
    () =>
      Object.entries(state.completed).reduce((sum, [key, done]) => {
        if (!done) return sum
        const missionId = key.split('|').at(-1)
        return sum + (missionMap[missionId]?.xp ?? 0)
      }, 0),
    [state.completed],
  )

  const activeLevelIndex = levels.reduce((active, level, index) => (totalXp >= level.min ? index : active), 0)
  const activeLevel = levels[activeLevelIndex]
  const nextLevel = levels[activeLevelIndex + 1]
  const levelProgress = nextLevel
    ? Math.min(100, Math.round(((totalXp - activeLevel.min) / (nextLevel.min - activeLevel.min)) * 100))
    : 100

  const version = versions[state.selectedVersion]
  const selectedDay = days.find((day) => day.id === state.selectedDay) ?? days[0]
  const currentWeekSchedule = getWeekSchedule(state.schedules, state.selectedVersion, state.selectedWeek)
  const dayMissions = getDayMissions(state.selectedVersion, state.selectedWeek, selectedDay, state.schedules)
  const selectedDayPlan = getDayPlan(state.selectedVersion, selectedDay)
  const weeklyMissionCount = days.reduce(
    (sum, day) => sum + getMissionIdsForDay(state.selectedVersion, state.selectedWeek, day).length,
    0,
  )
  const weekCompleted = days.reduce(
    (sum, day) => {
      const missionIds = getMissionIdsForDay(state.selectedVersion, state.selectedWeek, day, state.schedules)
      return (
        sum +
        missionIds.filter((missionId) =>
        state.completed[getMissionKey(state.selectedVersion, state.selectedWeek, day.id, missionId)],
        ).length
      )
    },
    0,
  )
  const dayCompleted = dayMissions.filter((mission) =>
    state.completed[getMissionKey(state.selectedVersion, state.selectedWeek, selectedDay.id, mission.id)],
  ).length
  const overallMissions = Object.entries(state.completed).filter(([key, done]) => done && missionMap[key.split('|').at(-1)]).length
  const statTotals = useMemo(() => getStatTotals(state.completed), [state.completed])
  const maxStatTotals = useMemo(() => getMaxStatTotals(), [])
  const weeklyStatTotals = useMemo(() => {
    const prefix = `${state.selectedVersion}|w${state.selectedWeek}|`
    const weekCompleted = Object.fromEntries(
      Object.entries(state.completed).filter(([key]) => key.startsWith(prefix))
    )
    return getStatTotals(weekCompleted)
  }, [state.completed, state.selectedVersion, state.selectedWeek])
  const overallPower = useMemo(() => getOverallPercent(statTotals, maxStatTotals), [statTotals, maxStatTotals])
  const allVersionStats = Object.keys(versions).map((versionKey) => ({
    versionKey,
    ...getVersionStats(state.completed, versionKey),
  }))
  const totalMissionCount = allVersionStats.reduce((sum, item) => sum + item.total, 0)
  const overallPercent = totalMissionCount ? Math.round((overallMissions / totalMissionCount) * 100) : 0

  // Progress tab: selected user data
  const progressUser = useMemo(() => {
    if (!allUsersData) return null
    const uid = progressUserId ?? currentUserId
    return allUsersData.find((d) => d.user.id === uid) ?? allUsersData[0]
  }, [allUsersData, progressUserId, currentUserId])
  const progressCompleted = progressUser?.state.completed ?? state.completed
  const progressXp = useMemo(() =>
    Object.entries(progressCompleted).reduce((sum, [key, done]) => {
      if (!done) return sum
      return sum + (missionMap[key.split('|').at(-1)]?.xp ?? 0)
    }, 0), [progressCompleted])
  const progressStatTotals = useMemo(() => getStatTotals(progressCompleted), [progressCompleted])
  const progressVersionStats = useMemo(() => Object.keys(versions).map((vk) => ({ versionKey: vk, ...getVersionStats(progressCompleted, vk) })), [progressCompleted])
  const progressOverallMissions = useMemo(() => Object.entries(progressCompleted).filter(([key, done]) => done && missionMap[key.split('|').at(-1)]).length, [progressCompleted])
  const progressOverallPercent = totalMissionCount ? Math.round((progressOverallMissions / totalMissionCount) * 100) : 0
  const progressLevelIndex = levels.reduce((a, l, i) => (progressXp >= l.min ? i : a), 0)
  const progressActiveLevel = levels[progressLevelIndex]
  const progressNextLevel = levels[progressLevelIndex + 1]
  const progressLevelProgress = progressNextLevel
    ? Math.min(100, Math.round(((progressXp - progressActiveLevel.min) / (progressNextLevel.min - progressActiveLevel.min)) * 100))
    : 100
  const memoKey =
    selectedDay.id === 'sun'
      ? getMemoKey(state.selectedVersion, state.selectedWeek)
      : getDailyMemoKey(state.selectedVersion, state.selectedWeek, selectedDay.id)
  const memoTitle = selectedDay.id === 'sun' ? c.weekendMemo : c.dailyDiary
  const memoHint = selectedDay.id === 'sun' ? c.weekendMemoHint : c.dailyDiaryHint
  const memoPlaceholder = selectedDay.id === 'sun' ? c.memoPlaceholder : c.dailyDiaryPlaceholder
  const requiredCounts = useMemo(
    () => countMissionIds(Object.values(getDefaultWeekSchedule(state.selectedVersion, state.selectedWeek)).flat()),
    [state.selectedVersion, state.selectedWeek],
  )
  const scheduledCounts = useMemo(() => countMissionIds(Object.values(currentWeekSchedule).flat()), [currentWeekSchedule])
  const previousWeekRef = getPreviousWeekRef(state.selectedVersion, state.selectedWeek)

  const updateState = (patch) => setState((current) => ({ ...current, ...patch }))

  const toggleMission = (missionId) => {
    if (selectedDay.rest) return
    const key = getMissionKey(state.selectedVersion, state.selectedWeek, selectedDay.id, missionId)
    setState((current) => ({
      ...current,
      completed: {
        ...current.completed,
        [key]: !current.completed[key],
      },
    }))
  }

  const setMemo = (value) => {
    setState((current) => ({
      ...current,
      memos: {
        ...current.memos,
        [memoKey]: value,
      },
    }))
  }

  const resetCurrentWeek = () => {
    setState((current) => {
      const completed = { ...current.completed }
      days.forEach((day) => {
        getMissionIdsForDay(current.selectedVersion, current.selectedWeek, day, current.schedules).forEach((missionId) => {
          delete completed[getMissionKey(current.selectedVersion, current.selectedWeek, day.id, missionId)]
        })
      })

      return {
        ...current,
        completed,
        memos: {
          ...current.memos,
          [getMemoKey(current.selectedVersion, current.selectedWeek)]: '',
        },
      }
    })
  }

  const moveMissionToDay = ({ missionId, sourceDayId, targetDayId }) => {
    const targetDay = days.find((day) => day.id === targetDayId)
    if (missionId === 'memo' || missionId === 'weekend-review') return
    if (!missionId || !targetDay || targetDay.rest) return

    setState((current) => {
      const scheduleKey = getScheduleKey(current.selectedVersion, current.selectedWeek)
      const schedule = getWeekSchedule(current.schedules, current.selectedVersion, current.selectedWeek)
      const targetMissions = schedule[targetDayId] ?? []
      if (targetMissions.includes(missionId) && sourceDayId !== targetDayId) return current
      if (sourceDayId === targetDayId) return current

      const nextSchedule = Object.fromEntries(days.map((day) => [day.id, [...(schedule[day.id] ?? [])]]))

      if (sourceDayId && sourceDayId !== 'pool') {
        nextSchedule[sourceDayId] = nextSchedule[sourceDayId].filter((id) => id !== missionId)
      } else {
        const required = requiredCounts[missionId] ?? 0
        const scheduled = countMissionIds(Object.values(nextSchedule).flat())[missionId] ?? 0
        if (scheduled >= required) return current
      }

      nextSchedule[targetDayId] = [...nextSchedule[targetDayId], missionId]
      const completed = { ...current.completed }

      if (sourceDayId && sourceDayId !== 'pool') {
        const sourceKey = getMissionKey(current.selectedVersion, current.selectedWeek, sourceDayId, missionId)
        const targetKey = getMissionKey(current.selectedVersion, current.selectedWeek, targetDayId, missionId)
        if (completed[sourceKey] && !completed[targetKey]) {
          completed[targetKey] = true
          delete completed[sourceKey]
        }
      }

      return {
        ...current,
        completed,
        schedules: {
          ...current.schedules,
          [scheduleKey]: nextSchedule,
        },
      }
    })
  }

  const resetCurrentPlan = () => {
    setState((current) => {
      const scheduleKey = getScheduleKey(current.selectedVersion, current.selectedWeek)
      const schedules = { ...current.schedules }
      delete schedules[scheduleKey]
      const completed = { ...current.completed }
      days.forEach((day) => {
        Object.keys(completed).forEach((key) => {
          if (key.startsWith(`${current.selectedVersion}|w${current.selectedWeek}|${day.id}|`)) {
            delete completed[key]
          }
        })
      })
      return { ...current, schedules, completed }
    })
  }

  const loadPreviousWeekPlan = () => {
    setState((current) => {
      const previous = getPreviousWeekRef(current.selectedVersion, current.selectedWeek)
      if (!previous) return current

      const currentScheduleKey = getScheduleKey(current.selectedVersion, current.selectedWeek)
      const previousScheduleKey = getScheduleKey(previous.version, previous.week)
      const previousSchedule = current.schedules?.[previousScheduleKey] ?? getDefaultWeekSchedule(previous.version, previous.week)
      const nextSchedule = sanitizeWeekSchedule(previousSchedule, current.selectedVersion, current.selectedWeek)
      const completed = { ...current.completed }

      Object.keys(completed).forEach((key) => {
        if (key.startsWith(`${current.selectedVersion}|w${current.selectedWeek}|`)) {
          delete completed[key]
        }
      })

      return {
        ...current,
        completed,
        selectedDay: 'mon',
        schedules: {
          ...current.schedules,
          [currentScheduleKey]: nextSchedule,
        },
      }
    })
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
          <p className="text-sm font-black">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="life-dashboard min-h-screen bg-[#f7f8fb] text-slate-900">
      <section className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 2xl:max-w-[104rem]">
        <header className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1.15fr_0.75fr_0.95fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Sparkles size={16} />
              {c.questBadge}
            </div>
            <h1 className="text-3xl font-black tracking-normal text-slate-950 sm:text-5xl">Life Game</h1>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">이번 주 획득 스탯</p>
              <div className="grid gap-2">
                {characterStats.map((stat) => {
                  const weekPts = weeklyStatTotals[stat.id] ?? 0
                  const maxWeekPts = 50
                  const pct = Math.min(100, Math.round((weekPts / maxWeekPts) * 100))
                  return (
                    <div key={stat.id} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs font-black text-slate-500">{tr(stat.label, lang)}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 shrink-0 text-right text-xs font-black text-slate-400">{weekPts}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <StatRadar lang={lang} c={c} statTotals={statTotals} maxStatTotals={maxStatTotals} overallPower={overallPower} />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{c.activeMember ?? copy.en.activeMember}</p>
                <div className="mt-2 flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                  <UserRound size={15} className="shrink-0 text-emerald-600" />
                  <select
                    value={currentUserId}
                    onChange={(event) => switchUser(event.target.value)}
                    className="h-9 min-w-28 bg-transparent text-sm font-black text-slate-950 outline-none"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
                {['ko', 'en'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateState({ lang: option })}
                    className={`h-8 rounded-md px-3 text-xs font-black transition ${
                      lang === option ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">{c.currentLevel}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{tr(activeLevel.name, lang)}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white">
                <Trophy size={24} />
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${levelProgress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-sm text-slate-500">
              <span>{totalXp} XP</span>
              <span>{nextLevel ? c.untilXp(nextLevel.min, levelProgress) : c.highestLevel}</span>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:flex sm:w-fit">
          <TabButton
            active={state.activeTab === 'quest'}
            icon={Compass}
            label={c.quest}
            onClick={() => updateState({ activeTab: 'quest' })}
          />
          <TabButton
            active={state.activeTab === 'progress'}
            icon={Gauge}
            label={c.progress}
            onClick={() => updateState({ activeTab: 'progress' })}
          />
          <TabButton
            active={state.showToc}
            icon={ListTree}
            label={c.roadmap}
            onClick={() => updateState({ showToc: !state.showToc, activeTab: 'quest' })}
          />
          <TabButton
            active={state.activeTab === 'diary'}
            icon={NotebookPen}
            label={c.diary ?? copy.en.diary}
            onClick={() => updateState({ activeTab: 'diary' })}
          />
        </nav>

        <CharacterStatus
          c={c}
          lang={lang}
          statTotals={statTotals}
          compact
        />

        {state.activeTab === 'quest' ? (
          <>
            {state.showToc && (
              <CurriculumToc
                curriculum={curriculum}
                selectedVersion={state.selectedVersion}
                selectedWeek={state.selectedWeek}
                lang={lang}
                isOpen={state.showToc}
                onToggle={() => updateState({ showToc: !state.showToc })}
                onSelectMonth={(item) =>
                  updateState({
                    selectedVersion: item.version,
                    selectedWeek: item.startWeek,
                    selectedDay: 'mon',
                  })
                }
              />
            )}

        <section className="grid gap-4">
          <section className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.56fr)_minmax(0,1fr)]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = getPrevVersionWeek(state.selectedVersion, state.selectedWeek)
                          if (prev) updateState({ selectedVersion: prev.version, selectedWeek: prev.week, selectedDay: 'mon' })
                        }}
                        disabled={!getPrevVersionWeek(state.selectedVersion, state.selectedWeek)}
                        className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-400 disabled:opacity-30"
                      >‹</button>
                      <p className="text-sm font-black text-emerald-600">
                        {version.label} · Week {state.selectedWeek} ·{' '}
                        {formatDateRange(getWeekStartDate(state.selectedVersion, state.selectedWeek), addDays(getWeekStartDate(state.selectedVersion, state.selectedWeek), 6))}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const next = getNextVersionWeek(state.selectedVersion, state.selectedWeek)
                          if (next) updateState({ selectedVersion: next.version, selectedWeek: next.week, selectedDay: 'mon' })
                        }}
                        disabled={!getNextVersionWeek(state.selectedVersion, state.selectedWeek)}
                        className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-400 disabled:opacity-30"
                      >›</button>
                      <button
                        type="button"
                        onClick={() => {
                          const { version: v, week: w, dayId } = getTodayVersionWeekDay()
                          updateState({ selectedVersion: v, selectedWeek: w, selectedDay: dayId })
                        }}
                        className="ml-1 inline-flex h-7 items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                      >오늘</button>
                    </div>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{tr(version.weeks[state.selectedWeek - 1], lang)}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{tr(version.theme, lang)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetCurrentWeek}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:border-slate-400"
                    title={c.resetTitle}
                  >
                    <RotateCcw size={16} />
                    {c.reset}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Stat label={c.weekComplete} value={`${weekCompleted}/${weeklyMissionCount}`} />
                  <Stat label={c.selectedDay} value={selectedDay.rest ? c.rest : `${dayCompleted}/${dayMissions.length}`} />
                  <Stat label={c.totalXp} value={`${totalXp}`} />
                </div>
              </div>

              <FamilyScheduleVisibility
                allUsersData={allUsersData}
                selectedVersion={state.selectedVersion}
                selectedWeek={state.selectedWeek}
                selectedDayId={selectedDay.id}
                lang={lang}
                calendarNode={clientId ? (gToken ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CalendarDays size={13} className={calSyncing ? 'animate-pulse text-blue-400' : calSynced ? 'text-emerald-400' : 'text-slate-500'} />
                    <span>{calSyncing ? '동기화 중...' : calSynced ? '동기화 완료' : '연결됨'}</span>
                    {calSynced && <button type="button" onClick={() => { hasSyncedRef.current = false; syncCalendar(gToken, allUsersData, lang) }} className="font-black hover:text-white">재동기화</button>}
                  </div>
                ) : (
                  <button type="button" onClick={connectGoogleCalendar} className="flex items-center gap-1 text-xs font-black text-slate-400 hover:text-blue-400">
                    <CalendarDays size={13} />연결
                  </button>
                )) : null}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-500">
                      {tr(selectedDay.label, lang)} · {formatDate(getDayDate(state.selectedVersion, state.selectedWeek, selectedDay.id))} · {tr(selectedDay.title, lang)}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {selectedDay.rest ? c.todayRest : c.todayMissions}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{tr(selectedDayPlan, lang)}</p>
                  </div>
                </div>

                <WeekPlannerCalendar
                  c={c}
                  days={days}
                  lang={lang}
                  schedule={currentWeekSchedule}
                  completed={state.completed}
                  selectedVersion={state.selectedVersion}
                  selectedWeek={state.selectedWeek}
                  selectedDayId={selectedDay.id}
                  onSelectDay={(dayId) => updateState({ selectedDay: dayId })}
                  onDropMission={moveMissionToDay}
                />

                {selectedDay.rest ? (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-white">
                      <Moon size={28} />
                    </div>
                    <p className="mt-4 text-xl font-black text-slate-950">{c.saturdayNoMissions}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {c.restNote}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {dayMissions.map((mission, index) => {
                      const completed = Boolean(
                        state.completed[getMissionKey(state.selectedVersion, state.selectedWeek, selectedDay.id, mission.id)],
                      )
                      const Icon = mission.icon
                      return (
                        <motion.button
                          key={`${selectedDay.id}-${mission.id}`}
                          type="button"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => toggleMission(mission.id)}
                          className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            completed ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className={`grid h-11 w-11 place-items-center rounded-lg border ${mission.tone}`}>
                              <Icon size={22} />
                            </div>
                            <CheckCircle2 className={completed ? 'text-emerald-500' : 'text-slate-300'} size={24} />
                          </div>
                          <p className="mt-4 text-lg font-black text-slate-950">{tr(mission.ko, lang)}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{mission.name}</p>
                          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">{tr(mission.detail, lang)}</p>
                          <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                            +{mission.xp} XP
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(mission.statRewards ?? {}).map(([statId, points]) => (
                              <span key={statId} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500">
                                {tr(statMap[statId]?.label, lang)} +{points}
                              </span>
                            ))}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>

              <ActivityPool
                c={c}
                lang={lang}
                requiredCounts={requiredCounts}
                scheduledCounts={scheduledCounts}
                onQuickAdd={(missionId) => moveMissionToDay({ missionId, sourceDayId: 'pool', targetDayId: selectedDay.id })}
                canLoadPrevious={Boolean(previousWeekRef)}
                onLoadPreviousWeek={loadPreviousWeekPlan}
                onResetPlan={resetCurrentPlan}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                  <NotebookPen size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">{memoTitle}</h2>
                  <p className="text-sm text-slate-500">{memoHint}</p>
                </div>
              </div>
              <textarea
                value={state.memos[memoKey] ?? ''}
                onChange={(event) => setMemo(event.target.value)}
                className="mt-4 min-h-36 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 text-base leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                placeholder={memoPlaceholder}
              />
            </div>
          </section>
        </section>
          </>
        ) : state.activeTab === 'diary' ? (
          <DiaryDashboard
            memos={state.memos}
            selectedVersion={state.selectedVersion}
            selectedWeek={state.selectedWeek}
            diaryView={state.diaryView ?? 'week'}
            lang={lang}
            onChangeView={(diaryView) => updateState({ diaryView })}
            onSelectWeek={(versionKey, week) =>
              updateState({
                activeTab: 'quest',
                selectedVersion: versionKey,
                selectedWeek: week,
                selectedDay: 'mon',
              })
            }
          />
        ) : (
          <ProgressDashboard
            curriculum={curriculum}
            completed={state.completed}
            totalXp={totalXp}
            activeLevel={activeLevel}
            nextLevel={nextLevel}
            levelProgress={levelProgress}
            lang={lang}
            statTotals={statTotals}
            overallMissions={overallMissions}
            totalMissionCount={totalMissionCount}
            overallPercent={overallPercent}
            completed={progressCompleted}
            totalXp={progressXp}
            activeLevel={progressActiveLevel}
            nextLevel={progressNextLevel}
            levelProgress={progressLevelProgress}
            statTotals={progressStatTotals}
            overallMissions={progressOverallMissions}
            overallPercent={progressOverallPercent}
            versionStats={progressVersionStats}
            selectedVersion={state.selectedVersion}
            selectedWeek={state.selectedWeek}
            allUsersData={allUsersData}
            maxStatTotals={maxStatTotals}
            progressUserId={progressUserId ?? currentUserId}
            onSelectProgressUser={setProgressUserId}
            onSelect={(versionKey, week) =>
              updateState({
                activeTab: 'quest',
                selectedVersion: versionKey,
                selectedWeek: week,
                selectedDay: 'mon',
              })
            }
          />
        )}
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function FamilyScheduleVisibility({ allUsersData, selectedVersion, selectedWeek, selectedDayId, lang, calendarNode }) {
  const actualTodayRef = getTodayVersionWeekDay()
  const sections = [
    {
      key: 'today',
      ref: actualTodayRef,
    },
    {
      key: 'tomorrow',
      ref: getNextDayRef(actualTodayRef.version, actualTodayRef.week, actualTodayRef.dayId),
    },
  ].map((section) => {
    const day = days.find((item) => item.id === section.ref.dayId) ?? days[0]
    const activities = getDayScheduleSummary(allUsersData, section.ref.version, section.ref.week, section.ref.dayId)
    return { ...section, day, activities }
  })

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-emerald-600">{lang === 'ko' ? '가족 일정 가시성' : 'Family Visibility'}</p>
      <h3 className="mt-1 text-xl font-black text-slate-950">
        {lang === 'ko' ? '오늘과 내일 활동 보드' : 'Today and Tomorrow Board'}
      </h3>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {sections.map((section) => (
          <div key={section.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="border-b border-sky-200 pb-2 text-center">
              <h4 className="mt-0.5 text-[1.7rem] font-black text-slate-950">
                {formatLongDate(getDayDate(section.ref.version, section.ref.week, section.ref.dayId), lang)}
              </h4>
            </div>

            <div className="mt-4 grid gap-2.5">
              {section.activities.length > 0 ? (
                section.activities.map(({ missionId, names }) => (
                  <div
                    key={`${section.key}-${missionId}`}
                    className="grid min-h-[52px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 md:grid-cols-[92px_minmax(0,1fr)]"
                  >
                    <p className="text-[15px] font-black text-slate-900">{tr(missionMap[missionId]?.ko, lang)}</p>
                    <div className="flex min-h-[24px] flex-wrap content-center gap-1.5 text-slate-800">
                      {names.map((name) => (
                        <span
                          key={`${section.key}-${missionId}-${name}`}
                          className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-black leading-none ${
                            userBadgeStyles[name] ?? 'border-slate-300 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm font-bold text-slate-400">
                  {lang === 'ko' ? '잡힌 활동 없음' : 'No activities planned'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition ${
        active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function WeekPlannerCalendar({
  c,
  days,
  lang,
  schedule,
  completed,
  selectedVersion,
  selectedWeek,
  selectedDayId,
  onSelectDay,
  onDropMission,
}) {
  const handleDrop = (event, targetDayId) => {
    event.preventDefault()
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/json'))
      onDropMission({ ...payload, targetDayId })
    } catch {
      // Ignore drops from outside the planner.
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-600">{c.weekPlanner ?? copy.en.weekPlanner}</p>
          <h3 className="text-lg font-black text-slate-950">{c.todayMissions}</h3>
        </div>
        <p className="text-xs font-bold leading-5 text-slate-500">{c.dragHint ?? copy.en.dragHint}</p>
      </div>

      <div className="-mx-1 mt-4 overflow-x-auto px-1">
        <div className="grid min-w-[46rem] grid-cols-7 gap-1.5 md:gap-2 lg:gap-3 xl:min-w-0">
          {days.map((day) => {
            const dayMissionIds = schedule[day.id] ?? []
            const selected = selectedDayId === day.id
            const completedCount = dayMissionIds.filter((missionId) =>
              completed[getMissionKey(selectedVersion, selectedWeek, day.id, missionId)],
            ).length
            const dayDate = formatDate(getDayDate(selectedVersion, selectedWeek, day.id))

            return (
              <div
                key={day.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDay(day.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectDay(day.id)
                }}
                onDragOver={(event) => {
                  if (!day.rest) event.preventDefault()
                }}
                onDrop={(event) => handleDrop(event, day.id)}
                className={`flex min-h-32 flex-col rounded-lg border p-2 text-left transition md:min-h-40 lg:min-h-44 lg:p-2.5 ${
                  selected
                    ? day.rest
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-emerald-500 bg-emerald-50'
                    : day.rest
                      ? 'border-slate-200 bg-slate-100'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <span className="flex min-h-9 items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block h-5 truncate text-sm font-black leading-5 text-slate-950">{tr(day.label, lang)}</span>
                    <span className="block h-4 text-[11px] font-bold leading-4 text-slate-400">{dayDate}</span>
                  </span>
                  <span className="grid h-5 min-w-9 shrink-0 place-items-center rounded-full bg-slate-100 px-2 text-[11px] font-black leading-none text-slate-500">
                    {day.rest ? 'REST' : `${completedCount}/${dayMissionIds.length}`}
                  </span>
                </span>

                <span className="mt-3 grid flex-1 content-start gap-1.5">
                  {day.rest ? (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-3 text-center text-xs font-black text-slate-500">
                      {c.fullRest}
                    </span>
                  ) : dayMissionIds.length === 0 ? (
                    <span className="rounded-md border border-dashed border-slate-200 px-2 py-3 text-center text-xs font-black text-slate-400">
                      {c.dropHere ?? copy.en.dropHere}
                    </span>
                  ) : (
                    dayMissionIds.map((missionId) => {
                      const mission = missionMap[missionId]
                      const complete = completed[getMissionKey(selectedVersion, selectedWeek, day.id, missionId)]
                      const fixed = missionId === 'weekend-review'
                      return (
                        <span
                          key={`${day.id}-${missionId}`}
                          draggable={!fixed}
                          onDragStart={(event) => {
                            if (fixed) return
                            event.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ missionId, sourceDayId: day.id }),
                            )
                          }}
                          className={`flex h-8 min-w-0 items-center justify-between gap-1.5 rounded-md border px-2 text-[11px] font-semibold active:cursor-grabbing sm:text-xs ${
                            fixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                          } ${
                            complete ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{tr(mission?.ko, lang)}</span>
                          <GripVertical size={12} className="shrink-0 text-slate-400" />
                        </span>
                      )
                    })
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActivityPool({ c, lang, requiredCounts, scheduledCounts, onQuickAdd, canLoadPrevious, onLoadPreviousWeek, onResetPlan }) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-500">{c.activityPool ?? copy.en.activityPool}</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{c.weekAtGlance}</h2>
        </div>
        <div className="grid shrink-0 gap-2">
          <button
            type="button"
            onClick={onResetPlan}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-500 transition hover:border-slate-400"
          >
            <RotateCcw size={13} />
            {c.resetPlan ?? copy.en.resetPlan}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{c.dragHint ?? copy.en.dragHint}</p>

      <button
        type="button"
        onClick={onLoadPreviousWeek}
        disabled={!canLoadPrevious}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-400 bg-emerald-50 px-3 text-sm font-black text-emerald-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:translate-y-0"
      >
        <CalendarCheck size={16} />
        {c.loadPreviousWeek ?? copy.en.loadPreviousWeek}
      </button>

      <div className="mt-4 grid gap-2">
        {Object.entries(requiredCounts).map(([missionId, required]) => {
          const mission = missionMap[missionId]
          const scheduled = scheduledCounts[missionId] ?? 0
          const remaining = Math.max(0, required - scheduled)
          const Icon = mission.icon

          return (
            <div key={missionId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <div className={`grid h-8 w-8 place-items-center rounded-lg border ${mission.tone}`}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{tr(mission.ko, lang)}</p>
                  <p className="text-xs font-bold text-slate-500">
                    {scheduled}/{required} {c.planned ?? copy.en.planned}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: remaining }).map((_, index) => (
                  <span
                    key={`${missionId}-${index}`}
                    draggable
                    role="button"
                    tabIndex={0}
                    onClick={() => onQuickAdd(missionId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') onQuickAdd(missionId)
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/json', JSON.stringify({ missionId, sourceDayId: 'pool' }))
                    }}
                    className="inline-flex cursor-grab items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600 active:cursor-grabbing"
                  >
                    <GripVertical size={12} />
                    {tr(mission.ko, lang)}
                  </span>
                ))}
                {remaining === 0 && (
                  <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                    {c.planned ?? copy.en.planned}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function CharacterStatus({ c, lang, statTotals, compact = false }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-600">{c.characterStatus}</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">RPG Status</h2>
        </div>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? 'md:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-5'}`}>
        {characterStats.map((stat) => {
          const points = statTotals[stat.id] ?? 0
          return (
            <div key={stat.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{tr(stat.label, lang)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{tr(stat.short, lang)}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white">{getStatLevel(points)}</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full bg-gradient-to-r ${stat.color}`} style={{ width: `${getStatPercent(points)}%` }} />
              </div>
              <p className="mt-2 text-sm font-black text-slate-950">{points} pts</p>
              {!compact && (
                <>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{tr(stat.detail, lang)}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{tr(stat.examples, lang)}</p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StatRadar({ lang, c, statTotals, maxStatTotals, overallPower }) {
  const size = 340
  const center = size / 2
  const radius = 88
  const angles = characterStats.map((_, index) => -Math.PI / 2 + (index * 2 * Math.PI) / characterStats.length)
  const pointAt = (angle, scale = 1) => [
    center + Math.cos(angle) * radius * scale,
    center + Math.sin(angle) * radius * scale,
  ]
  const polygon = angles
    .map((angle, index) => {
      const stat = characterStats[index]
      const maxPoints = maxStatTotals[stat.id] || 1
      const scale = Math.min(1, (statTotals[stat.id] ?? 0) / maxPoints)
      return pointAt(angle, scale).join(',')
    })
    .join(' ')

  return (
    <div className="mx-auto w-full max-w-[26rem] rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">전체 누적 스탯</p>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full" role="img" aria-label={c.characterStatus} style={{ fontFamily: "'Inter', 'Pretendard', system-ui, -apple-system, sans-serif" }}>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={angles.map((angle) => pointAt(angle, scale).join(',')).join(' ')}
            fill="none"
            stroke="rgba(142, 167, 203, 0.3)"
            strokeWidth="1.2"
          />
        ))}
        {angles.map((angle, index) => {
          const [x, y] = pointAt(angle, 1)
          const [labelX, labelY] = pointAt(angle, 1.45)
          const stat = characterStats[index]
          const anchor = labelX < center - 10 ? 'end' : labelX > center + 10 ? 'start' : 'middle'
          return (
            <g key={stat.id}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(142, 167, 203, 0.25)" strokeWidth="1" />
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="#e2eaf6"
                fontSize="16"
                fontWeight="700"
                letterSpacing="-0.3"
              >
                {tr(stat.label, lang)}
              </text>
            </g>
          )
        })}
        <polygon points={polygon} fill="rgba(0, 215, 192, 0.25)" stroke="#00d7c0" strokeWidth="2.5" />
        {polygon.split(' ').map((pair, index) => {
          const [x, y] = pair.split(',').map(Number)
          return <circle key={index} cx={x} cy={y} r="4" fill="#38bdf8" stroke="#f8fbff" strokeWidth="1.5" />
        })}
        <circle cx={center} cy={center} r="32" fill="#070b14" stroke="#2d4a72" strokeWidth="2" />
        <text x={center} y={center + 9} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="26" fontWeight="900" letterSpacing="-1">
          {overallPower}
        </text>
      </svg>
    </div>
  )
}

function DiaryDashboard({ memos, selectedVersion, selectedWeek, diaryView, lang, onChangeView, onSelectWeek }) {
  const c = copy[lang]
  const weekEntries = getWeekDiaryEntries(memos, selectedVersion, selectedWeek)
  const monthWeeks = getMonthDiaryEntries(memos, selectedVersion, selectedWeek)
  const monthStartWeek = getMonthBlockStartWeek(selectedWeek)
  const monthEndWeek = monthStartWeek + 3
  const monthStartDate = getWeekStartDate(selectedVersion, monthStartWeek)
  const monthEndDate = addDays(getWeekStartDate(selectedVersion, monthEndWeek), 6)
  const selectedWeekStart = getWeekStartDate(selectedVersion, selectedWeek)
  const selectedWeekEnd = addDays(selectedWeekStart, 6)
  const dayHeaderClass = 'rounded-lg border border-slate-200 bg-slate-50 p-3'

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-600">{c.diaryBoard ?? copy.en.diaryBoard}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {diaryView === 'week' ? (c.weeklyDiary ?? copy.en.weeklyDiary) : (c.monthlyDiary ?? copy.en.monthlyDiary)}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {diaryView === 'week'
                ? `${versions[selectedVersion].label} • ${c.week} ${selectedWeek} • ${formatDateRange(selectedWeekStart, selectedWeekEnd)}`
                : `${versions[selectedVersion].label} • ${c.month} ${monthStartWeek <= 4 ? 1 : 2} • ${formatDateRange(monthStartDate, monthEndDate)}`}
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onChangeView('week')}
              className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                diaryView === 'week' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-white'
              }`}
            >
              {c.week}
            </button>
            <button
              type="button"
              onClick={() => onChangeView('month')}
              className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                diaryView === 'month' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-white'
              }`}
            >
              {c.month}
            </button>
          </div>
        </div>
      </div>

      {diaryView === 'week' ? (
        <div className="grid gap-3 lg:grid-cols-7">
          {weekEntries.map((entry) => (
            <div key={entry.id} className={dayHeaderClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{tr(entry.label, lang)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(entry.date)}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {entry.id === 'sun' ? c.weekendMemo : c.dailyDiary}
                </span>
              </div>
              <div className="mt-3 min-h-32 rounded-lg border border-slate-200 bg-white p-3">
                {entry.text ? (
                  <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">{entry.text}</p>
                ) : (
                  <p className="text-sm text-slate-400">{c.noDiaryEntries ?? copy.en.noDiaryEntries}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 grid grid-cols-7 gap-3">
            {days.map((day) => (
              <div key={day.id} className="px-1 text-sm font-black text-slate-500">
                {tr(day.label, lang)}
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {monthWeeks.map((weekBlock) => (
              <div key={weekBlock.week} className="grid gap-3 lg:grid-cols-[84px_repeat(7,minmax(0,1fr))]">
                <button
                  type="button"
                  onClick={() => onSelectWeek(selectedVersion, weekBlock.week)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-left transition hover:border-slate-400 hover:bg-white"
                >
                  <p className="text-sm font-black text-slate-950">{c.week} {weekBlock.week}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatDateRange(getWeekStartDate(selectedVersion, weekBlock.week), addDays(getWeekStartDate(selectedVersion, weekBlock.week), 6))}
                  </p>
                </button>

                {weekBlock.entries.map((entry) => (
                  <div key={`${weekBlock.week}-${entry.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-950">{formatDate(entry.date)}</p>
                      {entry.text ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {entry.id === 'sun' ? c.weekendMemo : c.dailyDiary}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 min-h-24">
                      {entry.text ? (
                        <p className="max-h-20 overflow-hidden text-sm leading-5 text-slate-700">{getDiaryPreview(entry.text)}</p>
                      ) : (
                        <p className="text-xs text-slate-400">{c.noDiaryEntries ?? copy.en.noDiaryEntries}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function ProgressDashboard({
  curriculum,
  completed,
  totalXp,
  activeLevel,
  nextLevel,
  levelProgress,
  lang,
  statTotals,
  overallMissions,
  totalMissionCount,
  overallPercent,
  versionStats,
  selectedVersion,
  selectedWeek,
  allUsersData,
  maxStatTotals,
  progressUserId,
  onSelectProgressUser,
  onSelect,
}) {
  const c = copy[lang]
  const totalMissionCountVal = versionStats.reduce((s, v) => s + v.total, 0)
  return (
    <section className="space-y-4">
      {allUsersData && <AllUsersOverview allUsersData={allUsersData} lang={lang} />}

      {/* User selector tabs */}
      {allUsersData && (
        <div className="flex flex-wrap gap-2">
          {allUsersData.map(({ user }) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelectProgressUser(user.id)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                progressUserId === user.id
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] text-white">{user.name[0]}</span>
              {user.name}
            </button>
          ))}
        </div>
      )}



      <CharacterStatus c={c} lang={lang} statTotals={statTotals} />
      <TrendCharts completed={completed} lang={lang} />

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-black text-slate-500">{c.monthlyProgress}</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{c.curriculumCheck}</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {curriculum.map((item) => {
            const stats = getMonthStats(completed, item)
            return (
              <button
                key={item.month}
                type="button"
                onClick={() => onSelect(item.version, item.startWeek)}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-500">
                      {c.month} {item.month} · {versions[item.version].label} · {getMonthDateRange(item)}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{tr(item.title, lang)}</h3>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">{stats.percent}%</span>
                </div>
                <ProgressBar percent={stats.percent} className="mt-4" />
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {stats.done}/{stats.total} {c.missions}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ProgressBar({ percent, className = '' }) {
  return (
    <div className={`h-3 overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}

function TimePill({ icon: Icon, label }) {
  return (
    <div className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700">
      <Icon size={16} />
      {label}
    </div>
  )
}

function CurriculumToc({ curriculum, selectedVersion, selectedWeek, lang, isOpen, onToggle, onSelectMonth }) {
  const c = copy[lang]
  const columns = ['v1', 'v2', 'v3'].map((versionKey) => ({
    versionKey,
    items: curriculum.filter((item) => item.version === versionKey),
  }))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-600">{c.toc}</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{c.tocTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
        >
          <ListTree size={16} />
          {isOpen ? c.hide : c.show}
        </button>
      </div>

      {isOpen && <div className="mt-5 grid gap-4 md:grid-cols-3">
        {columns.map(({ versionKey, items }, columnIndex) => {
          const versionInfo = versions[versionKey]
          return (
            <div key={versionKey} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{versionInfo.label}</p>
                  <p className="text-sm font-bold text-slate-500">{tr(versionInfo.title, lang)}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-500">
                  {columnIndex === 0 ? c.start : columnIndex === 1 ? c.create : c.independent}
                </span>
              </div>

              <div className="grid gap-3">
                {items.map((item) => {
                  const active = item.version === selectedVersion && selectedWeek >= item.startWeek && selectedWeek <= item.startWeek + 3
                  return (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() => onSelectMonth(item)}
                      className={`rounded-lg border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        active ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-500">
                            {c.month} {item.month} · W{item.startWeek}-{item.startWeek + 3} · {getMonthDateRange(item)}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-slate-950">{tr(item.title, lang)}</h3>
                        </div>
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white">{versionInfo.label}</span>
                      </div>
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{tr(item.goal, lang)}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(item.statFocus ?? []).map((statId) => {
                          const stat = statMap[statId]
                          return (
                            <span key={statId} className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${stat.color} px-2.5 py-1 text-xs font-black text-white shadow-sm`}>
                              ↑ {tr(stat.label, lang)}
                            </span>
                          )
                        })}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.topics.map((topic) => (
                          <span key={tr(topic, 'en')} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                            {tr(topic, lang)}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>}
    </section>
  )
}

function ActivitySummary({ days, selectedVersion, selectedWeek, selectedDayId, lang, onSelectDay }) {
  const c = copy[lang]
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-black text-slate-500">{c.activitySummary}</p>
        <h2 className="mt-1 text-lg font-black text-slate-950">{c.weekAtGlance}</h2>
      </div>

      <div className="mt-4 grid gap-2">
        {days.map((day) => {
          const activities = getMissionIdsForDay(selectedVersion, selectedWeek, day)
            .filter((missionId) => missionId !== 'parent-talk')
            .map((missionId) => tr(missionMap[missionId]?.ko, lang))
            .filter(Boolean)
          const dayPlan = getDayPlan(selectedVersion, day)
          const selected = day.id === selectedDayId

          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelectDay(day.id)}
              className={`rounded-lg border p-3 text-left transition ${
                selected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-800">
                  {tr(day.label, lang)} · {tr(day.title, lang)}
                </span>
                {day.rest && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-black text-white">REST</span>}
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                {day.rest ? c.fullRest : activities.join(' · ')}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">{tr(dayPlan, lang)}</p>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function AllUsersOverview({ allUsersData, lang }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-emerald-600">All Members</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">전체 멤버 현황</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {allUsersData.map(({ user, state: userState }) => {
          const completed = userState.completed ?? {}
          const userTotalMissions = Object.keys(versions).reduce((sum, vk) =>
            sum + versions[vk].weeks.reduce((s, _, i) =>
              s + days.reduce((d, day) => d + getMissionIdsForDay(vk, i + 1, day).length, 0), 0), 0)
          const userMaxStats = getMaxStatTotals()
          const xp = Object.entries(completed).reduce((sum, [key, done]) => {
            if (!done) return sum
            const missionId = key.split('|').at(-1)
            return sum + (missionMap[missionId]?.xp ?? 0)
          }, 0)
          const doneMissions = Object.entries(completed).filter(([key, done]) => done && missionMap[key.split('|').at(-1)]).length
          const percent = userTotalMissions ? Math.round((doneMissions / userTotalMissions) * 100) : 0
          const levelIndex = levels.reduce((a, l, i) => (xp >= l.min ? i : a), 0)
          const level = levels[levelIndex]
          const statTotals = getStatTotals(completed)

          return (
            <div key={user.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">
                    {user.name[0]}
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-950">{user.name}</p>
                    <p className="text-xs font-bold text-slate-500">{tr(level.name, lang)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-black text-emerald-700">{xp} XP</span>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>전체 진행률</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-xs font-bold text-slate-400">{doneMissions}/{userTotalMissions} 미션</p>
              </div>

              <div className="mt-4 grid gap-1.5">
                {characterStats.map((stat) => {
                  const pts = statTotals[stat.id] ?? 0
                  const maxPts = userMaxStats[stat.id] || 1
                  const pct = Math.min(100, Math.round((pts / maxPts) * 100))
                  return (
                    <div key={stat.id} className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-[11px] font-black text-slate-500">{tr(stat.label, lang)}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full bg-gradient-to-r ${stat.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[11px] font-black text-slate-400">{pts}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const statLineColors = {
  intelligence: '#38bdf8',
  charisma: '#f472b6',
  vitality: '#34d399',
  creativity: '#a78bfa',
  leadership: '#fbbf24',
}

function getWeekStatPoints(completed, vk, week) {
  const prefix = `${vk}|w${week}|`
  const weekCompleted = Object.fromEntries(Object.entries(completed).filter(([k]) => k.startsWith(prefix)))
  return getStatTotals(weekCompleted)
}

function StatBarChart({ title, subtitle, xLabels, dataPoints, lang, fixedMax }) {
  const W = 600
  const H = 180
  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 28
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const n = xLabels.length

  const maxVal = Math.max(fixedMax ?? 0, 1)

  const statGroupWidth = chartW / characterStats.length
  const statGroupInnerWidth = Math.max(statGroupWidth - 10, 16)
  const barGap = n > 10 ? 0.75 : 1.5
  const barWidth = Math.max((statGroupInnerWidth - barGap * Math.max(n - 1, 0)) / Math.max(n, 1), 1.5)
  const statGroupStartX = (statIndex) => padL + statIndex * statGroupWidth + (statGroupWidth - statGroupInnerWidth) / 2
  const barX = (statIndex, periodIndex) => statGroupStartX(statIndex) + periodIndex * (barWidth + barGap)
  const statLabelX = (statIndex) => statGroupStartX(statIndex) + statGroupInnerWidth / 2
  const toY = (v) => padT + chartH - (v / maxVal) * chartH

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-emerald-600">{subtitle}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {characterStats.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="inline-block h-2 w-5 rounded-full" style={{ backgroundColor: statLineColors[s.id] }} />
            {tr(s.label, lang)}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" style={{ fontFamily: 'system-ui, sans-serif' }}>
        {/* Grid lines */}
        {gridLines.map((v) => {
          const y = toY(v)
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 4} y={y} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize="9">{v}</text>
            </g>
          )
        })}

        {/* Stat group separators */}
        {characterStats.slice(1).map((stat, index) => (
          <line
            key={stat.id}
            x1={padL + statGroupWidth * index}
            y1={padT}
            x2={padL + statGroupWidth * index}
            y2={padT + chartH}
            stroke="#1e293b"
            strokeWidth="1"
            opacity="0.65"
          />
        ))}

        {/* Stat labels */}
        {characterStats.map((stat, statIndex) => (
          <text
            key={stat.id}
            x={statLabelX(statIndex)}
            y={H - 6}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontWeight="700"
          >
            {tr(stat.label, lang)}
          </text>
        ))}

        {/* Bars grouped by stat */}
        {characterStats.map((stat, statIndex) => {
          const fill = statLineColors[stat.id]

          return (
            <g key={stat.id}>
              {dataPoints.map((point, periodIndex) => {
                const value = point[stat.id] ?? 0
                const y = toY(value)
                const height = chartH - (y - padT)

                return (
                  <rect
                    key={`${stat.id}-${periodIndex}`}
                    x={barX(statIndex, periodIndex)}
                    y={y}
                    width={barWidth}
                    height={Math.max(height, 0)}
                    rx="1.5"
                    fill={fill}
                    opacity="0.92"
                  >
                    <title>{`${tr(stat.label, lang)} - ${xLabels[periodIndex] ?? ''}: ${value}`}</title>
                  </rect>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function TrendCharts({ completed, lang }) {
  const weeklyAxisMax = getWeeklyChartAxisMax()
  const monthlyAxisMax = getMonthlyChartAxisMax()

  // Weekly: actual stat points earned in each week
  const allWeekDefs = Object.keys(versions).flatMap((vk) =>
    versions[vk].weeks.map((_, i) => ({ vk, week: i + 1, label: `${versions[vk].label} W${i + 1}` }))
  )
  const weeklyPoints = allWeekDefs.map(({ vk, week }) => getWeekStatPoints(completed, vk, week))
  const weeklyLabels = allWeekDefs.map((d, i) => (i % 4 === 0 ? d.label.replace(' ', '\n') : ''))
  const weeklyShortLabels = allWeekDefs.map((d, i) => {
    if (i === 0) return 'V1 W1'
    if (i === 8) return 'V2 W1'
    if (i === 16) return 'V3 W1'
    if (i % 4 === 0) return `W${d.week}`
    return ''
  })

  // Monthly: actual stat points earned in each month
  const monthDefs = [
    { version: 'v1', startWeek: 1 }, { version: 'v1', startWeek: 5 },
    { version: 'v2', startWeek: 1 }, { version: 'v2', startWeek: 5 },
    { version: 'v3', startWeek: 1 }, { version: 'v3', startWeek: 5 },
  ]
  const monthlyPoints = monthDefs.map(({ version, startWeek }) => {
    const monthTotals = Object.fromEntries(characterStats.map((s) => [s.id, 0]))

    for (let w = startWeek; w < startWeek + 4; w++) {
      const pts = getWeekStatPoints(completed, version, w)
      characterStats.forEach((s) => {
        monthTotals[s.id] = (monthTotals[s.id] ?? 0) + (pts[s.id] ?? 0)
      })
    }

    return monthTotals
  })
  const monthlyLabels = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <StatBarChart
        title={lang === 'ko' ? '주간 스탯 바 그래프' : 'Weekly Stat Bars'}
        subtitle="Weekly Growth"
        xLabels={weeklyShortLabels}
        dataPoints={weeklyPoints}
        lang={lang}
        fixedMax={weeklyAxisMax}
      />
      <StatBarChart
        title={lang === 'ko' ? '월별 스탯 바 그래프' : 'Monthly Stat Bars'}
        subtitle="Monthly Growth"
        xLabels={monthlyLabels}
        dataPoints={monthlyPoints}
        lang={lang}
        fixedMax={monthlyAxisMax}
      />
    </div>
  )
}
