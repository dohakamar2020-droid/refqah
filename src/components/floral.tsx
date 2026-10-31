/**
 * Lightweight hand-drawn-feeling botanical ornaments in the Dusty Rose
 * palette. Kept as inline SVG so the site ships no image requests.
 */

type Props = { className?: string };

export function FloralBranch({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 120 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M60 258C60 200 58 150 46 108C38 80 30 58 34 30"
        stroke="#DDB8C5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M56 196C40 188 28 176 24 158C44 158 56 172 56 196Z"
        fill="#F0DCE3"
      />
      <path
        d="M52 148C68 140 80 128 84 110C64 110 52 124 52 148Z"
        fill="#F0DCE3"
      />
      <path
        d="M48 104C34 96 24 84 20 66C38 66 48 80 48 104Z"
        fill="#F0DCE3"
      />
      <g fill="#DDB8C5">
        <circle cx="34" cy="24" r="9" opacity="0.85" />
        <circle cx="22" cy="36" r="7" opacity="0.7" />
        <circle cx="46" cy="36" r="7" opacity="0.7" />
        <circle cx="28" cy="12" r="6" opacity="0.55" />
        <circle cx="44" cy="12" r="6" opacity="0.55" />
      </g>
      <circle cx="34" cy="26" r="3.5" fill="#B77B91" opacity="0.7" />
      <g fill="#F0DCE3">
        <circle cx="60" cy="228" r="6" opacity="0.9" />
        <circle cx="72" cy="216" r="4.5" opacity="0.75" />
      </g>
    </svg>
  );
}

export function FloralCorner({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 60C50 58 96 42 130 8"
        stroke="#DDB8C5"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M40 40C56 26 76 20 96 22C82 40 66 50 46 52C40 52 36 48 40 40Z"
        fill="#F0DCE3"
      />
      <path
        d="M104 66C120 52 140 46 160 48C146 66 130 76 110 78C104 78 100 74 104 66Z"
        fill="#F0DCE3"
        opacity="0.8"
      />
      <g fill="#DDB8C5" opacity="0.75">
        <circle cx="24" cy="26" r="8" />
        <circle cx="12" cy="42" r="6" />
        <circle cx="40" cy="12" r="6" />
        <circle cx="18" cy="10" r="4.5" />
        <circle cx="38" cy="40" r="4.5" />
      </g>
      <circle cx="24" cy="27" r="3" fill="#B77B91" opacity="0.65" />
    </svg>
  );
}

export function OrnamentDivider({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 12H96" stroke="#DDB8C5" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M144 12H230" stroke="#DDB8C5" strokeWidth="1.5" strokeLinecap="round" />
      <g fill="#DDB8C5" opacity="0.9">
        <circle cx="120" cy="12" r="5" />
        <circle cx="108" cy="12" r="3" />
        <circle cx="132" cy="12" r="3" />
      </g>
      <circle cx="120" cy="12" r="1.8" fill="#B77B91" />
    </svg>
  );
}

export function SmallFlower({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g fill="#DDB8C5">
        <circle cx="20" cy="9" r="6" />
        <circle cx="31" cy="20" r="6" />
        <circle cx="20" cy="31" r="6" />
        <circle cx="9" cy="20" r="6" />
      </g>
      <circle cx="20" cy="20" r="4" fill="#B77B91" />
    </svg>
  );
}

/** Bismillah-style wordmark used in the header and hero. */
export function LogoMark({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill="#F0DCE3" />
      <path
        d="M24 10c-6 4-9 8-9 14s3 10 9 14c6-4 9-8 9-14s-3-10-9-14Z"
        fill="#DDB8C5"
      />
      <path
        d="M24 18c0 4-3 5-6 5 0-3 3-5 6-5Zm0 0c0 4 3 5 6 5 0-3-3-5-6-5Z"
        fill="#995C74"
        opacity="0.55"
      />
      <circle cx="24" cy="30" r="2.5" fill="#995C74" />
    </svg>
  );
}
