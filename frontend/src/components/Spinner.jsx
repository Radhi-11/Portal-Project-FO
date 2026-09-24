import './Spinner.css';

export default function Spinner({ size = 24, label = 'Loading...' }) {
  return (
    <div className="spinner-container" role="status" aria-label={label}>
      <div className="spinner" style={{ width: size, height: size }} />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
