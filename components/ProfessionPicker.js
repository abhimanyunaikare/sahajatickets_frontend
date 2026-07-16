const PROFESSIONS = [
    'Doctor', 'Lawyer / Advocate', 'IT', 'Teacher / Professor',
    'Finance / Accounts', 'Electrical', 'Construction & Related',
    'Student', 'Food & Hotel', 'Tours & Travel', 'Police Department', 'Other'
  ];
  
  export default function ProfessionPicker({ value, onChange }) {
    return (
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">Select profession</option>
        {PROFESSIONS.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    );
  }