import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'Nyte - Home' },
    { name: 'description', content: 'Welcome to Nyte!' },
  ];
}

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Welcome to Nyte</h1>
      <p>This is your home page built with React Router framework mode.</p>
      <nav>
        <ul>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
