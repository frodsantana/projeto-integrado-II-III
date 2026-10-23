import { useEffect, useRef, useState } from 'react';
import { api, message } from '../../shared/api';
import type {
  Calendar,
  Course,
  Group,
  Lesson,
  Notice,
  Room,
  Staff,
  Subject,
} from '../../shared/types';
import {
  Alert,
  Button,
  Field,
  Modal,
  formatDate,
  isoDate,
  monday,
  plusDays,
} from '../../shared/ui';
import { useResource } from '../../shared/useResource';
import { DeleteForm } from './DeleteForm';
import { LessonForm } from './LessonForm';
import { LocationForm } from './LocationForm';
import { ProfessorSemesterList } from './ProfessorSemesterList';
import type { Details } from './types';

type Audience = 'coordinator' | 'professor' | 'student';
interface Base {
  courses: Course[];
  calendar: Calendar;
  rooms: Room[];
}

const empty: Details = { lessons: [], subjects: [], staff: [], groups: [] };
const clamp = (date: string, calendar: Calendar) =>
  date < calendar.start ? calendar.start : date > calendar.end ? calendar.end : date;
export function SchedulePage({ audience }: { audience: Audience }) {
  const anonymous = audience === 'student';
  const base = useResource<Base>(`base:${audience}`, async (signal) => {
    const [courses, calendar, rooms] = await Promise.all([
      api<Course[]>(anonymous ? '/public/courses' : '/courses', { signal, public: anonymous }),
      api<Calendar>(anonymous ? '/public/calendar' : '/calendar', { signal, public: anonymous }),
      anonymous ? Promise.resolve([]) : api<Room[]>('/rooms', { signal }),
    ]);
    return { courses, calendar, rooms };
  });
  if (!base.data)
    return (
      <section className="panel">
        <h1>
          {anonymous
            ? 'Consulta de aulas'
            : audience === 'coordinator'
              ? 'Gerenciador do Cronograma Semestral'
              : 'Minhas aulas'}
        </h1>
        <Alert>{base.error}</Alert>
        <p role="status">{base.loading ? 'Carregando cursos…' : ''}</p>
        <Button variant="secondary" onClick={base.reload}>
          Atualizar cronograma
        </Button>
      </section>
    );
  return <Schedule audience={audience} base={base.data} />;
}
function Schedule({
  audience,
  base,
}: {
  audience: Audience;
  base: Base;
}) {
  const coordinator = audience === 'coordinator',
    student = audience === 'student';
  const [course, setCourse] = useState(coordinator ? (base.courses[0]?.id ?? '') : '');
  const [semester, setSemester] = useState('');
  const [professor, setProfessor] = useState('');
  const [period, setPeriod] = useState('');
  const [date, setDate] = useState('');
  const current = clamp(isoDate(new Date()), base.calendar);
  const [view, setView] = useState<'term' | 'week' | 'month'>(coordinator ? 'term' : 'week');
  const [week, setWeek] = useState(monday(current));
  const [month, setMonth] = useState(current.slice(0, 7));
  const [editor, setEditor] = useState<{ lesson?: Lesson; date: string } | null>(null);
  const [location, setLocation] = useState<Lesson | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const details = useResource<Details>(`details:${audience}:${course}`, async (signal) => {
    const selected = course
      ? [course]
      : audience === 'professor'
        ? base.courses.map((c) => c.id)
        : [];
    if (!selected.length) return empty;
    const results = await Promise.all(
      selected.map((id) =>
        api<Lesson[]>(
          `${student ? '/public' : ''}/lessons?${new URLSearchParams({ courseId: id, from: base.calendar.start, to: base.calendar.end })}`,
          { signal, public: student },
        ),
      ),
    );
    const [subjects, staff, groups] = await Promise.all([
      coordinator && course
        ? api<Subject[]>(`/subjects?courseId=${course}`, { signal })
        : Promise.resolve([]),
      coordinator && course
        ? api<{ users: Staff[] }>(`/courses/${course}/staff`, { signal }).then((r) => r.users)
        : Promise.resolve([]),
      course
        ? api<Group[]>(`${student ? '/public' : ''}/groups?courseId=${course}`, {
            signal,
            public: student,
          })
        : Promise.resolve([]),
    ]);
    return { lessons: results.flat(), subjects, staff, groups };
  });
  const noticeWeek = date ? monday(date) : week;
  const notices = useResource<Notice[]>(`notices:${course}:${semester}:${noticeWeek}`, (signal) =>
    student && course && semester
      ? api(`/public/notifications?courseId=${course}&semester=${semester}&from=${noticeWeek}&to=${plusDays(noticeWeek, 6)}`, {
          signal,
          public: true,
        })
      : Promise.resolve([]),
  );
  useEffect(() => {
    if (noticesOpen && notices.data)
      setRead((previous) => new Set([...previous, ...notices.data!.map((n) => n.id)]));
  }, [noticesOpen, notices.data]);
  const data = details.data;
  const visible =
    data?.lessons.filter(
      (l) =>
        (!semester || l.groups.some((g) => g.semester === +semester)) &&
        (!professor || l.professor_id === professor) &&
        ((!period && !student) ||
          (period === 'MATUTINO' && l.starts_at < '12:00') ||
          (period === 'NOTURNO' && l.starts_at >= '19:00')) &&
        (!student || view !== 'month' || l.lesson_date.slice(0, 7) === month) &&
        (!date || l.lesson_date === date),
    ) ?? [];
  const selectedCourse = base.courses.find((c) => c.id === course);
  const semesters = [...new Set(data?.groups.map((g) => g.semester))].sort((a, b) => a - b);
  const months: { value: string; label: string }[] = [];
  const monthCursor = new Date(`${base.calendar.start.slice(0, 7)}-01T12:00:00`);
  while (isoDate(monthCursor).slice(0, 7) <= base.calendar.end.slice(0, 7)) {
    months.push({
      value: isoDate(monthCursor).slice(0, 7),
      label: monthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }
  const weeks: string[] = [];
  for (let d = monday(base.calendar.start); d <= base.calendar.end; d = plusDays(d, 7)) {
    if (date && monday(date) !== d) continue;
    if (!date && view === 'week' && d !== week) continue;
    if (
      !date &&
      view === 'month' &&
      d.slice(0, 7) !== month &&
      plusDays(d, 4).slice(0, 7) !== month
    )
      continue;
    weeks.push(d);
  }
  useEffect(() => {
    if (!data || view !== 'term' || date) return;
    const row = scroll.current?.querySelector<HTMLElement>(`[data-week="${monday(current)}"]`);
    if (row && scroll.current) scroll.current.scrollTop = row.offsetTop - 40;
  }, [data, view, date, current]);
  function refresh() {
    details.reload();
    notices.reload();
  }
  async function publish() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ published: number }>(`/courses/${course}/publish`, {
        method: 'POST',
      });
      setFeedback(
        result.published ? `${result.published} aula(s) publicada(s).` : 'Não há aulas pendentes.',
      );
      refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function open(date: string, lesson?: Lesson) {
    setError('');
    if (!data) return;
    const missing = [
      !data.subjects.length && 'matérias',
      !data.staff.some((s) => s.role === 'PROFESSOR') && 'professores vinculados',
      !data.groups.length && 'turmas',
      !base.rooms.length && 'salas',
    ].filter(Boolean);
    if (missing.length) {
      setError(
        `Para adicionar aulas, solicite ao administrador o cadastro de: ${missing.join(', ')}.`,
      );
      return;
    }
    setEditor({ date, lesson });
  }
  const unread = (notices.data ?? []).filter((n) => !read.has(n.id)).length;
  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1>
            {coordinator
              ? 'Gerenciador do Cronograma Semestral'
              : student
                ? 'Consulta de aulas'
                : 'Minhas aulas'}
          </h1>
          <p className="muted">
            {formatDate(base.calendar.start)} a {formatDate(base.calendar.end)}
            {coordinator && data
              ? ` · ${data.lessons.filter((l) => !l.published).length} aula(s) pendente(s)`
              : ''}
          </p>
        </div>
        <div className="actions">
          {coordinator && (
            <>
              <Button disabled={!data || !course || busy} onClick={() => open(current)}>
                ＋ Adicionar Aula
              </Button>
              <Button
                variant="danger"
                disabled={!data?.lessons.length || busy}
                onClick={() => setDeleting(true)}
              >
                Excluir Aula
              </Button>
              <Button
                variant="success"
                disabled={!data || !course || busy}
                onClick={() => void publish()}
              >
                Publicar Cronograma
              </Button>
            </>
          )}
          {student && (
            <Button
              variant="secondary"
              disabled={!course || !semester}
              onClick={() => {
                setNoticesOpen(true);
                setRead(new Set([...read, ...(notices.data ?? []).map((n) => n.id)]));
              }}
            >
              Notificações ({unread})
            </Button>
          )}
        </div>
      </section>
      <section className="panel space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="Curso">
            <select
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setProfessor('');
                setSemester('');
                setError('');
                setFeedback('');
              }}
            >
              {audience === 'professor' && <option value="">Todos os meus cursos</option>}
              {student && <option value="">Selecione o curso</option>}
              {base.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {(coordinator || student) && (
            <Field label="Semestre">
              <select
                value={semester}
                disabled={student && !course}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">{student ? 'Selecione o semestre' : 'Todos os semestres'}</option>
                {(semesters.length
                  ? semesters
                  : Array.from({ length: selectedCourse?.semesters ?? 1 }, (_, i) => i + 1)
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}º semestre
                  </option>
                ))}
              </select>
            </Field>
          )}
          {coordinator && (
            <Field label="Professor">
              <select value={professor} onChange={(e) => setProfessor(e.target.value)}>
                <option value="">Todos os professores</option>
                {data?.staff
                  .filter((s) => s.role === 'PROFESSOR')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Período">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="" disabled={student}>
                {student ? 'Selecione o período' : 'Todos os períodos'}
              </option>
              <option value="MATUTINO">Matutino</option>
              <option value="NOTURNO">Noturno</option>
            </select>
          </Field>
          {coordinator && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Data da aula</span>
              <div className="flex gap-2 items-center">
              <label
                className="btn btn-secondary relative min-h-10 shrink-0"
                title={date ? formatDate(date) : 'Filtrar por data'}
              >
                📅
                <input
                  aria-label="Filtrar por data"
                  type="date"
                  min={base.calendar.start}
                  max={base.calendar.end}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {
                      /* native picker fallback */
                    }
                  }}
                />
              </label>
              <Button variant="secondary" className="min-h-10 whitespace-nowrap" disabled={!date} onClick={() => setDate('')}>
                {date ? formatDate(date) + ' ×' : 'Limpar data'}
              </Button>
              </div>
            </div>
          )}
        </div>
        {audience === 'professor' ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Visualização das aulas" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex">
              <Button
                variant={view === 'term' ? 'primary' : 'secondary'}
                aria-pressed={view === 'term'}
                className="min-h-10 whitespace-nowrap"
                onClick={() => setView('term')}
              >
                Semestre inteiro
              </Button>
              <Button
                variant={view === 'week' ? 'primary' : 'secondary'}
                aria-pressed={view === 'week'}
                className="min-h-10 whitespace-nowrap"
                onClick={() => {
                  setWeek(monday(current));
                  setView('week');
                }}
              >
                Semana atual
              </Button>
            </div>
            {view === 'week' && (
              <nav aria-label="Navegar entre semanas" className="flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  className="min-h-10"
                  aria-label="Semana anterior"
                  disabled={week <= monday(base.calendar.start)}
                  onClick={() => setWeek(plusDays(week, -7))}
                >
                  <span aria-hidden="true">←</span> Anterior
                </Button>
                <span className="px-2 text-xs font-medium text-slate-600 whitespace-nowrap">
                  Semana {Math.round((Date.parse(week) - Date.parse(monday(base.calendar.start))) / 604800000) + 1}
                </span>
                <Button
                  variant="secondary"
                  className="min-h-10"
                  aria-label="Próxima semana"
                  disabled={plusDays(week, 7) > base.calendar.end}
                  onClick={() => setWeek(plusDays(week, 7))}
                >
                  Próxima <span aria-hidden="true">→</span>
                </Button>
              </nav>
            )}
          </div>
        ) : (
        <div className="flex flex-wrap justify-between gap-3 items-end border-t border-slate-100 pt-4">
          {student && (
            <div className="order-2 w-full sm:w-auto">
              <Button variant="secondary" className="min-h-10 w-full sm:w-auto whitespace-nowrap" onClick={refresh} disabled={busy}>
                Atualizar aulas
              </Button>
            </div>
          )}
          <div className={`flex flex-wrap gap-3 items-end ${student ? 'order-1 w-full sm:w-auto' : 'w-full'}`}>
            {student && (
              <div role="group" aria-label="Visualização das aulas" className="grid w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:w-auto sm:inline-flex">
                <Button
                  variant={view === 'week' ? 'primary' : 'secondary'}
                  aria-pressed={view === 'week'}
                  className="min-h-10 whitespace-nowrap"
                  onClick={() => {
                    setWeek(monday(current));
                    setView('week');
                  }}
                >
                  Semana atual
                </Button>
                <Button
                  variant={view === 'month' ? 'primary' : 'secondary'}
                  aria-pressed={view === 'month'}
                  className="min-h-10 whitespace-nowrap"
                  onClick={() => setView('month')}
                >
                  Mês
                </Button>
              </div>
            )}
            {!student && (
              <div role="group" aria-label="Visualização das aulas" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex">
                <Button
                  variant={view === 'term' ? 'primary' : 'secondary'}
                  aria-pressed={view === 'term'}
                  className="min-h-10 whitespace-nowrap"
                  onClick={() => setView('term')}
                >
                  Semestre inteiro
                </Button>
                <Button
                  variant={view === (coordinator ? 'month' : 'week') ? 'primary' : 'secondary'}
                  aria-pressed={view === 'month'}
                  className="min-h-10 whitespace-nowrap"
                  onClick={() => setView(coordinator ? 'month' : 'week')}
                >
                  {coordinator ? 'Mês' : 'Semana atual'}
                </Button>
              </div>
            )}
            {(student || coordinator) && (
              <div
                className={`flex h-12 w-full items-center sm:w-48 ${view !== 'month' ? 'invisible' : ''}`}
                aria-hidden={view !== 'month'}
              >
                <select
                  aria-label="Selecionar mês"
                  className="h-10"
                  disabled={view !== 'month'}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {months.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
            {!student && view === 'week' && (
              <>
                <Button
                  variant="secondary"
                  disabled={week <= monday(base.calendar.start)}
                  onClick={() => setWeek(plusDays(week, -7))}
                >
                  Semana anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={plusDays(week, 7) > base.calendar.end}
                  onClick={() => setWeek(plusDays(week, 7))}
                >
                  Próxima semana
                </Button>
              </>
            )}
          </div>
        </div>
        )}
      </section>
      <Alert>{error || details.error}</Alert>
      <p role="status">{details.loading ? 'Carregando aulas…' : feedback}</p>
      {base.courses.length === 0 && (
        <p className="panel">Nenhum curso disponível para este acesso.</p>
      )}
      {student && base.courses.length > 0 && (!course || !semester || !period) && (
        <p className="panel">Selecione seu curso, semestre e período para consultar as aulas.</p>
      )}
      {data && (!student || (course && semester && period)) && (
        <div
          ref={scroll}
          className="relative overflow-auto max-h-[65vh] rounded-xl border border-slate-200 bg-white"
        >
          {audience === 'professor' && view === 'term' ? (
            <ProfessorSemesterList
              lessons={visible}
              semesterStart={base.calendar.start}
              showCourse={!course}
              onEdit={setLocation}
            />
          ) : (
          <table className="schedule">
            <thead>
              <tr>
                <th>Semana</th>
                {[
                  'Segunda-feira',
                  'Terça-feira',
                  'Quarta-feira',
                  'Quinta-feira',
                  'Sexta-feira',
                ].map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w} data-week={w}>
                  <td>
                    {`Semana ${Math.round((Date.parse(w) - Date.parse(monday(base.calendar.start))) / 604800000) + 1}`}
                  </td>
                  {Array.from({ length: 5 }, (_, i) => plusDays(w, i)).map((day) => (
                    <td key={day}>
                      <span className="text-slate-500">{formatDate(day)}</span>
                      {coordinator && day >= base.calendar.start && day <= base.calendar.end && (
                        <button className="block text-blue-700 mt-2" onClick={() => open(day)}>
                          ＋ Adicionar aula
                        </button>
                      )}
                      {visible
                        .filter((l) => l.lesson_date === day)
                        .map((l) => (
                          <article
                            key={l.id}
                            className={`lesson ${l.status === 'CANCELLED' ? 'opacity-60' : ''}`}
                          >
                            <p>
                              {l.starts_at.slice(0, 5)} – {l.ends_at.slice(0, 5)}
                            </p>
                            <h2 className="text-xs text-blue-800">{l.subject_name}</h2>
                            <p>{l.professor_name}</p>
                            <p>📍 {l.room_name}</p>
                            {!course && <p className="muted">{l.course_name}</p>}
                            <p className="muted">
                              {l.status === 'CANCELLED'
                                ? 'Cancelada'
                                : l.published
                                  ? 'Publicada'
                                  : 'Rascunho'}
                            </p>
                            {coordinator ? (
                              <button
                                className="text-blue-700 pt-2"
                                onClick={() => open(l.lesson_date, l)}
                              >
                                Editar
                              </button>
                            ) : (
                              !student && (
                                <button
                                  className="text-blue-700 pt-2"
                                  onClick={() => setLocation(l)}
                                >
                                  Alterar aula
                                </button>
                              )
                            )}
                          </article>
                        ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          )}
          {visible.length === 0 && (
            <p className="p-4 muted">Nenhuma aula encontrada para os filtros selecionados.</p>
          )}
        </div>
      )}
      {editor && data && selectedCourse && (
        <LessonForm
          course={selectedCourse}
          calendar={base.calendar}
          rooms={base.rooms}
          data={data}
          initial={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setFeedback('Aula salva.');
            refresh();
          }}
        />
      )}
      {location && (
        <LocationForm
          lesson={location}
          rooms={base.rooms}
          onClose={() => setLocation(null)}
          onSaved={() => {
            setLocation(null);
            setFeedback('Aula atualizada.');
            refresh();
          }}
        />
      )}
      {deleting && data && (
        <DeleteForm
          lessons={data.lessons}
          onClose={() => setDeleting(false)}
          onSaved={() => {
            setDeleting(false);
            setFeedback('Todas as ocorrências da série foram excluídas.');
            refresh();
          }}
        />
      )}
      {noticesOpen && (
        <Modal title="Notificações da semana" onClose={() => setNoticesOpen(false)}>
          <p className="muted mb-3">{formatDate(noticeWeek)} a {formatDate(plusDays(noticeWeek, 6))}</p>
          <Alert>{notices.error}</Alert>
          {notices.loading ? (
            <p>Carregando…</p>
          ) : notices.data?.length ? (
            <ul className="space-y-3">
              {notices.data.map((n) => (
                <li key={n.id} className="bg-slate-50 rounded-lg p-3">
                  <p>{n.message}</p>
                  <small className="muted">
                    {new Date(n.created_at).toLocaleString('pt-BR', { hour12: false })}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma notificação para esta semana.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
