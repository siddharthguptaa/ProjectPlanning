import React, { useMemo } from 'react';
import { varianceFor, milestoneVariance } from '../dateMath.js';

// Looks at one project's epics and milestones and counts up how many are
// in each state (on track, behind, unplanned, etc.), plus builds a list
// of the specific things that need attention (late epics, overdue
// milestones). Returns a plain object — no React here, just counting.
function computeProjectStats(project) {
  let onTrackCount = 0;
  let behindCount = 0;
  let unplannedCount = 0;
  let notStartedCount = 0;
  const needsAttention = [];

  project.epics.forEach((epic) => {
    if (!epic.planStart) {
      unplannedCount++;
      if (epic.actualStart) {
        needsAttention.push({ name: epic.name, chipText: 'Unplanned', chipClass: 'unplanned' });
      }
      return;
    }
    if (!epic.actualStart) {
      notStartedCount++;
      return;
    }
    const variance = varianceFor(epic);
    if (variance && variance.value > 0) {
      behindCount++;
      const suffix = variance.ongoing ? ' so far' : '';
      needsAttention.push({ name: epic.name, chipText: '+' + variance.value + ' md' + suffix, chipClass: 'late' });
    } else {
      onTrackCount++;
    }
  });

  let overdueMilestoneCount = 0;
  let nextUpcomingMilestone = null;

  project.milestones.forEach((milestone) => {
    const variance = milestoneVariance(milestone);
    if (!variance) return;

    if (variance.pending && variance.overdue) {
      overdueMilestoneCount++;
      needsAttention.push({ name: milestone.name, chipText: variance.value + 'd overdue', chipClass: 'late' });
    } else if (variance.pending) {
      const isSoonerThanCurrentNext = !nextUpcomingMilestone || variance.daysLeft < nextUpcomingMilestone.daysLeft;
      if (isSoonerThanCurrentNext) {
        nextUpcomingMilestone = { name: milestone.name, daysLeft: variance.daysLeft };
      }
    }
  });

  return {
    onTrackCount, behindCount, unplannedCount, notStartedCount,
    overdueMilestoneCount, nextUpcomingMilestone, needsAttention
  };
}

function Overview({ projects, onOpenProject }) {
  // Computed once per `projects` change, then reused both for the
  // portfolio totals below AND passed straight into each card — so each
  // project's stats are calculated exactly once, not once for the totals
  // and again inside every card.
  const statsByProject = useMemo(
    () => projects.map((project) => ({ project, stats: computeProjectStats(project) })),
    [projects]
  );

  const portfolioTotals = useMemo(() => {
    return statsByProject.reduce(
      (totals, { project, stats }) => ({
        totalEpics: totals.totalEpics + project.epics.length,
        totalBehind: totals.totalBehind + stats.behindCount,
        totalUnplanned: totals.totalUnplanned + stats.unplannedCount,
        totalOverdueMilestones: totals.totalOverdueMilestones + stats.overdueMilestoneCount
      }),
      { totalEpics: 0, totalBehind: 0, totalUnplanned: 0, totalOverdueMilestones: 0 }
    );
  }, [statsByProject]);

  return (
    <div>
      <div className="portfolio-stats">
        <StatChip number={projects.length} label="Projects" />
        <StatChip number={portfolioTotals.totalEpics} label="Total epics" />
        <StatChip number={portfolioTotals.totalBehind} label="Epics behind" warn={portfolioTotals.totalBehind > 0} />
        <StatChip number={portfolioTotals.totalUnplanned} label="Unplanned epics" />
        <StatChip number={portfolioTotals.totalOverdueMilestones} label="Milestones overdue" warn={portfolioTotals.totalOverdueMilestones > 0} />
      </div>

      <div className="project-grid">
        {statsByProject.map(({ project, stats }) => (
          <ProjectCard key={project.id} project={project} stats={stats} onOpenProject={onOpenProject} />
        ))}
      </div>
    </div>
  );
}

// Memoized: stats/project are only new objects when that specific
// project's data actually changed (see useMemo above), so switching
// projects or editing one doesn't re-render every other card.
const ProjectCard = React.memo(function ProjectCard({ project, stats, onOpenProject }) {
  const epicsWithAnyStatus = stats.onTrackCount + stats.behindCount + stats.unplannedCount + stats.notStartedCount || 1;

  return (
    <div className="project-ov-card">
      <div className="ov-head">
        <div className="ov-title" title={project.name}>{project.name}</div>
        <button className="ov-open" onClick={() => onOpenProject(project.id)}>Open →</button>
      </div>

      <div className="ov-stats-row">
        <div className="cell"><div className="n">{project.epics.length}</div><div className="l">Epics</div></div>
        <div className="cell c-ok"><div className="n">{stats.onTrackCount}</div><div className="l">On track</div></div>
        <div className="cell c-late"><div className="n">{stats.behindCount}</div><div className="l">Behind</div></div>
        <div className="cell c-unplanned"><div className="n">{stats.unplannedCount}</div><div className="l">Unplanned</div></div>
      </div>

      {/* A thin bar showing the mix of epic statuses as proportional colored segments. */}
      <div className="ov-health-bar">
        <span className="seg-ok" style={{ width: (stats.onTrackCount / epicsWithAnyStatus) * 100 + '%' }} />
        <span className="seg-late" style={{ width: (stats.behindCount / epicsWithAnyStatus) * 100 + '%' }} />
        <span className="seg-unplanned" style={{ width: (stats.unplannedCount / epicsWithAnyStatus) * 100 + '%' }} />
        <span className="seg-pending" style={{ width: (stats.notStartedCount / epicsWithAnyStatus) * 100 + '%' }} />
      </div>

      <div className="ov-attention-label">Needs attention ({stats.needsAttention.length})</div>
      <div className="ov-attention-list">
        {stats.needsAttention.length === 0 ? (
          <div className="ov-empty-note">✅ Nothing needs attention right now.</div>
        ) : (
          stats.needsAttention.map((item, index) => (
            <div className="ov-attention-item" key={index}>
              <span className="ai-name" title={item.name}>{item.name}</span>
              <span className={'ai-chip ' + item.chipClass}>{item.chipText}</span>
            </div>
          ))
        )}
      </div>

      {stats.nextUpcomingMilestone && (
        <div className="ov-next-ms">
          Next milestone: <b>{stats.nextUpcomingMilestone.name}</b> —{' '}
          {stats.nextUpcomingMilestone.daysLeft === 0 ? 'due today' : stats.nextUpcomingMilestone.daysLeft + 'd left'}
        </div>
      )}
    </div>
  );
});

function StatChip({ number, label, warn }) {
  return (
    <div className={'portfolio-stat' + (warn ? ' warn' : '')}>
      <div className="num">{number}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export default React.memo(Overview);
