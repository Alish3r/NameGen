import type { NameResult } from '@/generator';
import clsx from 'clsx';
import { ScoreMeter } from './ScoreMeter';
import { StatusPill } from './StatusPill';
import { RowDisclosure } from './RowDisclosure';

export type AvailabilityStatus = 'available' | 'unavailable' | 'unsure' | null;

export type TldStatus = 'available' | 'parked' | 'active' | 'unknown' | null;

export interface TldStatusMap {
  com?: TldStatus;
  net?: TldStatus;
  io?: TldStatus;
}

type TableDensity = 'comfortable' | 'compact';

interface ResultsTableProps {
  names: NameResult[];
  probeColumns: boolean;
  getAvailability: (name: string) => AvailabilityStatus;
  getTldStatus: (name: string) => TldStatusMap;
  favorites?: Set<string>;
  onFavoriteToggle?: (name: string) => void;
  density?: TableDensity;
}

function toPillStatus(tld: TldStatus | null | undefined): 'available' | 'parked' | 'active' | 'unknown' | 'empty' {
  if (!tld) return 'empty';
  if (tld === 'available') return 'available';
  if (tld === 'parked') return 'parked';
  if (tld === 'active') return 'active';
  return 'unknown';
}

export function ResultsTable({
  names,
  probeColumns,
  getAvailability,
  getTldStatus,
  favorites,
  onFavoriteToggle,
  density = 'comfortable',
}: ResultsTableProps) {
  return (
    <div className={clsx('table-wrap', density === 'compact' && 'table-wrap--compact')}>
      <table>
        <thead>
          <tr>
            {onFavoriteToggle && <th className="fav-cell" aria-label="Shortlist" />}
            <th>Name</th>
            <th>Score</th>
            <th>Pattern</th>
            {probeColumns && (
              <>
                <th>.com</th>
                <th>.net</th>
                <th>.io</th>
              </>
            )}
            <th>Reasons</th>
          </tr>
        </thead>
        <tbody>
          {names.map((n, i) => {
            const avail = getAvailability(n.name);
            const tld = getTldStatus(n.name);
            const shortReasons = n.reasons.slice(0, 2).join(' · ');
            const fullReasons = n.reasons.join(' · ');

            return (
              <tr key={`${n.name}-${i}`} className="results-table__row">
                {onFavoriteToggle && (
                  <td className="fav-cell">
                    <button
                      type="button"
                      className={clsx('fav-btn', favorites?.has(n.name) && 'fav-btn--active')}
                      onClick={() => onFavoriteToggle(n.name)}
                      aria-label={favorites?.has(n.name) ? `Remove ${n.name} from shortlist` : `Add ${n.name} to shortlist`}
                      title={favorites?.has(n.name) ? 'Remove from shortlist' : 'Add to shortlist'}
                    >
                      ★
                    </button>
                  </td>
                )}
                <td className={clsx('name-cell', `name-cell--${avail ?? 'unprobed'}`)}>
                  {n.name}
                </td>
                <td className="score-cell">
                  <ScoreMeter score={n.score} />
                </td>
                <td>{n.patternUsed}</td>
                {probeColumns && (
                  <>
                    <td className="tld-cell">
                      <StatusPill
                        status={toPillStatus(tld.com)}
                        title={tld.com ? `${n.name}.com: ${tld.com}` : undefined}
                      />
                    </td>
                    <td className="tld-cell">
                      <StatusPill
                        status={toPillStatus(tld.net)}
                        title={tld.net ? `${n.name}.net: ${tld.net}` : undefined}
                      />
                    </td>
                    <td className="tld-cell">
                      <StatusPill
                        status={toPillStatus(tld.io)}
                        title={tld.io ? `${n.name}.io: ${tld.io}` : undefined}
                      />
                    </td>
                  </>
                )}
                <td className="reasons-cell">
                  <RowDisclosure
                    summary={shortReasons || '—'}
                    details={fullReasons || '—'}
                    summaryClassName={density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
