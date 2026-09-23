// Synthetic, deterministic demo data. No real employee information.
export function createSeed() {
  const core = [
    ['SK_SYSTEM_DESIGN', 'System Design', 'Engineering'],
    ['SK_PYTHON', 'Python', 'Engineering'],
    ['SK_PUBLIC_SPEAKING', 'Public Speaking', 'Collaboration'],
    ['SK_MENTORING', 'Mentoring', 'Leadership'],
    ['SK_SECURITY', 'Security', 'Engineering'],
    ['SK_DELIVERY', 'Project Delivery', 'Leadership'],
  ];
  const extra = ['SQL', 'API Design', 'Testing', 'Observability', 'Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'Data Modeling', 'Architecture', 'Performance', 'Debugging', 'Linux', 'Networking', 'Cryptography', 'Risk Analysis', 'Compliance', 'Product Thinking', 'Discovery', 'Research', 'Analytics', 'Experimentation', 'Accessibility', 'UX Writing', 'Visual Design', 'Prototyping', 'Interaction Design', 'Design Systems', 'Facilitation', 'Negotiation', 'Feedback', 'Coaching', 'Delegation', 'Planning', 'Prioritization', 'Stakeholder Management', 'Conflict Resolution', 'Decision Making', 'Strategy', 'Budgeting', 'Business Analysis', 'Customer Empathy', 'Documentation', 'Technical Writing', 'Presentation Design', 'Time Management', 'Adaptability', 'Critical Thinking', 'Problem Solving', 'Teamwork', 'Financial Literacy', 'Kazakh Communication', 'English Communication'];
  const skills = [...core, ...extra.map((name, i) => [`SK_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`, name, i < 18 ? 'Engineering' : 'Collaboration'])].map(([skill_id, name, category], i) => ({
    skill_id, name, category,
    requirements: { Junior: 1, Middle: 2, Senior: i === 2 ? 2 : i === 0 || i === 1 || i === 4 ? 4 : 3, Lead: 5 },
  }));
  const employees = Array.from({ length: 200 }, (_, i) => ({
    employee_id: `E${String(i + 1).padStart(4, '0')}`,
    name: i === 27 ? 'Aida S.' : `Demo colleague ${String(i + 1).padStart(3, '0')}`,
    role: 'Backend Engineer', department: ['Digital Banking', 'Core Platforms', 'Payments', 'Data & Analytics'][i % 4],
    grade: i === 27 ? 'Middle' : ['Junior', 'Middle', 'Middle', 'Senior'][i % 4],
    tenure_months: i === 27 ? 52 : 12 + (i * 7) % 49,
    skills: Object.fromEntries(core.map(([id], j) => [id, i === 27 ? [2, 3, 1, 2, 3, 2][j] : 1 + (i + j * 3) % 4])),
  }));
  const featured = [
    ['EV001', 'Design systems that scale', 'workshop', 'SK_SYSTEM_DESIGN', 1, 4, 3, 'Work through real architecture decisions with a senior engineer. Leave with a reviewed system design.'],
    ['EV002', 'Python beyond the basics', 'course', 'SK_PYTHON', 1, 4, 4, 'Build reliable services with practical patterns for maintainable Python.'],
    ['EV003', 'Find your voice', 'workshop', 'SK_PUBLIC_SPEAKING', 1, 4, 2, 'Practice presenting a technical idea in a supportive small group.'],
    ['EV004', 'A better first code review', 'mentoring', 'SK_MENTORING', 1, 3, 1, 'Pair with a colleague and practice giving useful, actionable feedback.'],
    ['EV005', 'Secure by design', 'lab', 'SK_SECURITY', 1, 4, 2, 'Threat-model a banking API and strengthen its security boundaries.'],
    ['EV006', 'From idea to delivery', 'challenge', 'SK_DELIVERY', 1, 4, 3, 'Break an ambitious project into a clear, achievable delivery plan.'],
  ];
  const events = [...featured, ...Array.from({ length: 34 }, (_, i) => {
    const skill = skills[i + 6];
    return [`EV${String(i + 7).padStart(3, '0')}`, `${skill.name}: practice session`, ['course', 'workshop', 'mentoring', 'lab'][i % 4], skill.skill_id, 1, 4, 1 + i % 4, `Develop ${skill.name.toLowerCase()} through a guided, practical activity.`];
  })].map(([event_id, title, type, skill, gain, max_level, duration_hours, description]) => ({ event_id, title, type, description, duration_hours, audience: ['Backend Engineer'], grades: ['Junior', 'Middle', 'Senior', 'Lead'], skills: [{ skill_id: skill, gain, max_level }], voluntary: true }));
  const history = [];
  for (const [i, employee] of employees.entries()) {
    for (let month = 0; month < 24; month++) {
      if ((i + month) % 5 === 0) continue;
      const event = events[(i + month) % events.length];
      history.push({ history_id: `H${i}-${month}`, employee_id: employee.employee_id, event_id: event.event_id, date: new Date(Date.UTC(2024, 9 + month, 10)).toISOString(), status: (i + month) % 9 === 0 ? 'no_show' : (i + month) % 11 === 0 ? 'declined' : 'completed', on_time: (i + month) % 7 !== 0 });
    }
  }
  // Deliberately adversarial profile: lowest skill is not the best next step.
  const aidaHistory = history.filter(h => h.employee_id !== 'E0028');
  ['2026-05-10', '2026-06-10', '2026-07-10'].forEach((date, i) => aidaHistory.push({ history_id: `HA${i}`, employee_id: 'E0028', event_id: 'EV003', date, status: 'no_show', on_time: false }));
  ['EV002', 'EV005'].forEach((event_id, i) => aidaHistory.push({ history_id: `HA${i + 3}`, employee_id: 'E0028', event_id, date: `2026-08-${10 + i}`, status: 'completed', on_time: true }));
  return { employees, events, skills, history: aidaHistory, enrollments: [], version: 1 };
}
