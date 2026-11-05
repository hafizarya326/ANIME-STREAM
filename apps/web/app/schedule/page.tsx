import { Suspense } from "react";
import { CalendarClock } from "lucide-react";
import { AnimeCard } from "../../components/AnimeCard";
import { ErrorState } from "../../components/ErrorState";
import { FallbackBanner } from "../../components/FallbackBanner";
import { SectionHeader } from "../../components/SectionHeader";
import { SourceSwitcher } from "../../components/SourceSwitcher";
import {
  WEEK_DAYS,
  currentWibDay,
  getSchedule,
  pickSource,
  type ScheduleItem,
} from "../../lib/api";

interface PageProps {
  searchParams?: Record<string, string | string[]>;
}

const getParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const DAY_INDEX: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

// Current wall-clock minutes since midnight in WIB (schedule times are WIB).
const wibMinutesNow = (): number => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const [h, m] = parts.split(":").map(Number);
    return h * 60 + m;
  } catch {
    return 0;
  }
};

const minutesFromTime = (releaseTime: string): number | null => {
  const match = releaseTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

// "Sudah Tayang" vs "Akan Tayang" derived from the upstream WIB schedule time
// and the current WIB clock — never fabricated. Items without a time get no
// indicator (e.g. otakudesu schedule has none upstream).
const airStatusFor = (
  item: ScheduleItem,
  activeDay: string,
  today: string,
): "released" | "upcoming" | null => {
  if (!item.releaseTime) return null;
  const itemMinutes = minutesFromTime(item.releaseTime);
  if (itemMinutes === null) return null;
  const todayIdx = DAY_INDEX[today] ?? 0;
  const activeIdx = DAY_INDEX[activeDay] ?? todayIdx;
  const diff = (activeIdx - todayIdx + 7) % 7;
  if (diff === 0) {
    return itemMinutes <= wibMinutesNow() ? "released" : "upcoming";
  }
  return diff <= 6 && diff >= 5 ? "released" : "upcoming";
};

export default async function SchedulePage({ searchParams }: PageProps) {
  const source = pickSource(getParam(searchParams?.source));
  const today = currentWibDay();
  const dayParam = getParam(searchParams?.day);
  const activeDay =
    dayParam && WEEK_DAYS.some((d) => d.id === dayParam) ? dayParam : today;

  const response = await getSchedule(source, activeDay);
  const data = response.data;
  const days = data?.days ?? [];
  const activeDayData =
    days.find((d) => d.id === data?.activeDay) ??
    days.find((d) => d.id === activeDay) ??
    null;
  const items = activeDayData?.animeList ?? [];

  return (
    <div className="space-y-10">
      {data?.meta && <FallbackBanner meta={data.meta} />}

      <Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-card border-2 border-black" />}>
        <SourceSwitcher currentSource={source} />
      </Suspense>

      <section className="space-y-6">
        <SectionHeader
          title="Jadwal Rilis Anime"
          subtitle={`Jadwal tayang mingguan dari upstream ${source} (zona waktu WIB)`}
          badge="Schedule"
          action={
            <div className="flex items-center gap-2 rounded-xl border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-brand-yellow shadow-brutal-sm">
              <CalendarClock className="h-4 w-4" />
              <span>Hari Ini: {WEEK_DAYS.find((d) => d.id === today)?.label ?? today}</span>
            </div>
          }
        />

        {/* Day navigation tabs */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-black bg-card p-3 shadow-brutal">
          {(days.length > 0 ? days : WEEK_DAYS).map((day) => {
            const isActive = day.id === (data?.activeDay ?? activeDay);
            const isToday = day.id === today;
            return (
              <a
                key={day.id}
                href={`/schedule?source=${source}&day=${day.id}`}
                className={`relative inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? "border-black bg-brand-yellow text-black shadow-brutal -translate-y-0.5"
                    : "border-card-border bg-[#0e121d] text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <span>{day.label}</span>
                {isToday && (
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-400"
                    title="Hari ini"
                  />
                )}
              </a>
            );
          })}
        </div>

        {data?.note && (
          <div className="rounded-2xl border-2 border-dashed border-card-border bg-card/50 px-4 py-3 text-xs font-semibold text-slate-400">
            {data.note}
          </div>
        )}

        {response.error && !items.length ? (
          <ErrorState
            message={response.error}
            action={
              <a
                href={`/schedule?source=${source}&day=${activeDay}`}
                className="btn-brutal inline-block rounded-xl border-black bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black"
              >
                Muat Ulang
              </a>
            }
          />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-card-border p-12 text-center text-sm font-semibold text-slate-400">
            Tidak ada jadwal rilis untuk hari ini di sumber {source}. Silakan pilih hari lain di atas.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
            {items.map((item) => (
              <AnimeCard
                key={`${source}-${item.id}`}
                anime={{
                  id: item.id,
                  title: item.title,
                  poster: item.poster,
                  episodes: item.episode,
                  latestReleaseDate: null,
                  releaseDay: null,
                  type: item.type ?? null,
                }}
                source={source}
                releaseTime={item.releaseTime}
                airStatus={airStatusFor(item, data?.activeDay ?? activeDay, today)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
