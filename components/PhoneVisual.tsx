import { useId } from "react";
import styles from "./PhoneVisual.module.css";

type PhoneVisualProps = { compact?: boolean };

export default function PhoneVisual({ compact = false }: PhoneVisualProps) {
  const prefix = `phone-${useId().replace(/:/g, "")}`;
  const id = (name: string) => `${prefix}-${name}`;

  return (
    <div className={`${styles.visual} ${compact ? styles.compact : ""}`}>
      <svg
        viewBox="0 0 420 410"
        fill="none"
        role="img"
        aria-labelledby={id("title")}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id={id("title")}>
          Black titanium iPhone 16, showing its dual cameras and luminous violet display
        </title>
        <defs>
          <linearGradient id={id("back-edge")} x1="92" y1="75" x2="245" y2="357" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A7A8B0" />
            <stop offset=".025" stopColor="#42434B" />
            <stop offset=".25" stopColor="#74757E" />
            <stop offset=".48" stopColor="#25262D" />
            <stop offset=".78" stopColor="#777983" />
            <stop offset="1" stopColor="#35363D" />
          </linearGradient>
          <linearGradient id={id("back")} x1="105" y1="86" x2="246" y2="352" gradientUnits="userSpaceOnUse">
            <stop stopColor="#32343F" />
            <stop offset=".42" stopColor="#232631" />
            <stop offset="1" stopColor="#141722" />
          </linearGradient>
          <linearGradient id={id("back-sheen")} x1="113" y1="76" x2="199" y2="333" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B6BCCB" stopOpacity=".13" />
            <stop offset=".36" stopColor="#9BA4BB" stopOpacity=".015" />
            <stop offset="1" stopColor="#08101F" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id={id("camera-case")} x1="110" y1="90" x2="157" y2="176" gradientUnits="userSpaceOnUse">
            <stop stopColor="#555965" />
            <stop offset=".23" stopColor="#2C3039" />
            <stop offset="1" stopColor="#12151C" />
          </linearGradient>
          <linearGradient id={id("lens-ring")} x1="118" y1="100" x2="149" y2="133" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A5A8B3" />
            <stop offset=".15" stopColor="#3C414F" />
            <stop offset=".5" stopColor="#0C101A" />
            <stop offset=".84" stopColor="#6C7180" />
            <stop offset="1" stopColor="#222735" />
          </linearGradient>
          <radialGradient id={id("lens")} cx=".42" cy=".34" r=".67">
            <stop stopColor="#293D63" />
            <stop offset=".23" stopColor="#0C1427" />
            <stop offset=".45" stopColor="#101B35" />
            <stop offset=".64" stopColor="#020711" />
            <stop offset=".85" stopColor="#10182C" />
            <stop offset="1" stopColor="#02040B" />
          </radialGradient>
          <linearGradient id={id("front-edge")} x1="194" y1="62" x2="362" y2="334" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B0ADB9" />
            <stop offset=".03" stopColor="#55535F" />
            <stop offset=".24" stopColor="#9A97A4" />
            <stop offset=".5" stopColor="#393741" />
            <stop offset=".75" stopColor="#77747F" />
            <stop offset="1" stopColor="#C3BCC8" />
          </linearGradient>
          <linearGradient id={id("screen")} x1="220" y1="55" x2="333" y2="351" gradientUnits="userSpaceOnUse">
            <stop stopColor="#081B45" />
            <stop offset=".33" stopColor="#100A36" />
            <stop offset=".76" stopColor="#151042" />
            <stop offset="1" stopColor="#090B20" />
          </linearGradient>
          <linearGradient id={id("ribbon-main")} x1="218" y1="173" x2="347" y2="284" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A6AAFF" />
            <stop offset=".23" stopColor="#8373FF" />
            <stop offset=".53" stopColor="#6547EE" />
            <stop offset=".82" stopColor="#37249D" />
            <stop offset="1" stopColor="#100B38" />
          </linearGradient>
          <linearGradient id={id("ribbon-light")} x1="212" y1="249" x2="329" y2="132" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4631C2" />
            <stop offset=".32" stopColor="#8A79F9" />
            <stop offset=".55" stopColor="#D0D2FF" />
            <stop offset=".72" stopColor="#7D8DED" />
            <stop offset="1" stopColor="#253478" />
          </linearGradient>
          <linearGradient id={id("ribbon-bottom")} x1="212" y1="305" x2="344" y2="290" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A154E" />
            <stop offset=".36" stopColor="#5841D9" />
            <stop offset=".64" stopColor="#ADA1FF" />
            <stop offset="1" stopColor="#3D44A4" />
          </linearGradient>
          <radialGradient id={id("cyan-glow")} cx="0" cy="0" r="1" gradientTransform="translate(337 110) rotate(132) scale(138 107)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6DE2EC" />
            <stop offset=".36" stopColor="#368CC5" />
            <stop offset=".7" stopColor="#18366A" />
            <stop offset="1" stopColor="#0D1540" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("glass-reflection")} x1="215" y1="49" x2="340" y2="350" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".09" />
            <stop offset=".3" stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="white" stopOpacity=".015" />
          </linearGradient>
          <filter id={id("shadow")} x="-60%" y="-30%" width="220%" height="180%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="23" stdDeviation="17" floodColor="#00030D" floodOpacity=".55" />
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity=".55" />
          </filter>
          <filter id={id("camera-shadow")} x="-50%" y="-30%" width="200%" height="180%">
            <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="black" floodOpacity=".5" />
          </filter>
          <clipPath id={id("screen-clip")}>
            <rect x="202.5" y="45.5" width="147" height="310" rx="25.5" />
          </clipPath>
        </defs>

        <g transform="rotate(-13 168 218)" filter={`url(#${id("shadow")})`}>
          <rect x="94" y="74" width="149" height="294" rx="29.5" fill={`url(#${id("back-edge")})`} />
          <rect x="96.1" y="75.3" width="145.5" height="291" rx="28" fill={`url(#${id("back")})`} stroke="#A8ADBF" strokeOpacity=".22" strokeWidth=".7" />
          <rect x="98.2" y="77.3" width="141.3" height="287" rx="26" fill={`url(#${id("back-sheen")})`} stroke="#080B14" strokeOpacity=".6" strokeWidth=".5" />
          <path d="M95 117V139M95 153V178M95 187V212" stroke="#A6A6AE" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M242.2 150V191" stroke="#666771" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M106 78.8C113 75.8 116 75.8 124 75.8H211" stroke="#D5D7E1" strokeOpacity=".38" strokeWidth=".7" strokeLinecap="round" />
          <path d="M95.5 110V326" stroke="#C3C8D6" strokeOpacity=".19" strokeWidth=".65" />

          <g filter={`url(#${id("camera-shadow")})`}>
            <rect x="108" y="88" width="47" height="87" rx="23.5" fill={`url(#${id("camera-case")})`} stroke="#878B98" strokeOpacity=".43" strokeWidth=".8" />
            {[112.5, 150.5].map((cy) => (
              <g key={cy}>
                <circle cx="131.5" cy={cy} r="19" fill={`url(#${id("lens-ring")})`} stroke="#090C13" strokeWidth=".8" />
                <circle cx="131.5" cy={cy} r="16.1" fill="#060912" stroke="#686F83" strokeOpacity=".32" strokeWidth=".6" />
                <circle cx="131.5" cy={cy} r="12.7" fill={`url(#${id("lens")})`} />
                <circle cx="131.5" cy={cy} r="8.8" stroke="#4D6391" strokeOpacity=".2" strokeWidth=".8" />
                <circle cx="131.5" cy={cy} r="5.4" fill="#080D20" stroke="#102B4F" strokeWidth=".7" />
                <ellipse cx="127.5" cy={cy - 5} rx="4.4" ry="2.1" transform={`rotate(-34 127.5 ${cy - 5})`} fill="#8B9ACE" fillOpacity=".35" />
                <circle cx="134.6" cy={cy + 4.2} r="1.6" fill="#5675B8" fillOpacity=".45" />
                <path d={`M119 ${cy - 11}C122 ${cy - 15} 126 ${cy - 17} 131 ${cy - 17}`} stroke="#CDD5EF" strokeOpacity=".46" strokeWidth=".6" strokeLinecap="round" />
              </g>
            ))}
          </g>
          <circle cx="169.2" cy="112.3" r="5.3" fill="#CAC9BF" stroke="#444956" strokeWidth="1.4" />
          <circle cx="169.2" cy="112.3" r="3.6" fill="#E3E0D0" />
          <circle cx="169.2" cy="133.5" r="1.35" fill="#080B12" />
          <g transform="translate(155 213)" fill="#878C9B" fillOpacity=".35">
            <path d="M20.5 7.3c-2.9-.2-5 1.6-6.3 1.6-1.4 0-3.3-1.5-5.6-1.4C5.7 7.6 3 9.5 1.6 12c-3 5.2-.8 12.9 2.1 17.2 1.4 2.1 3.1 4.4 5.4 4.3 2.2-.1 3-1.4 5.7-1.4 2.6 0 3.4 1.4 5.7 1.3 2.4 0 3.9-2.1 5.3-4.2 1.7-2.4 2.3-4.7 2.4-4.9-.1 0-4.6-1.8-4.6-7 0-4.4 3.6-6.5 3.8-6.6-2.1-3-5.3-3.3-6.9-3.4Z" />
            <path d="M19.3 4.8c1.2-1.5 2.1-3.5 1.8-5.5-1.8.1-3.9 1.2-5.2 2.7-1.2 1.4-2.2 3.4-1.9 5.4 2 .1 4-1 5.3-2.6Z" />
          </g>
          <path d="M108 352.5C112 360 119 363.8 130 363.8H211" stroke="#838898" strokeOpacity=".17" strokeWidth=".65" />
        </g>

        <g transform="rotate(12 276 202)" filter={`url(#${id("shadow")})`}>
          <rect x="195" y="38" width="162" height="325" rx="33" fill={`url(#${id("front-edge")})`} />
          <rect x="197" y="39.4" width="158" height="322" rx="31" fill="#07080E" stroke="#D6D1E0" strokeOpacity=".3" strokeWidth=".7" />
          <rect x="199.2" y="42" width="153.6" height="317" rx="28" fill="#020309" stroke="#3C3949" strokeWidth=".65" />
          <path d="M195.5 108V128M195.5 141V166M195.5 177V202" stroke="#84818C" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M357.5 132V174" stroke="#74717F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M357.3 216V235" stroke="#625F6C" strokeWidth="2" strokeLinecap="round" />
          <g clipPath={`url(#${id("screen-clip")})`}>
            <rect x="202" y="45" width="148" height="312" fill={`url(#${id("screen")})`} />
            <rect x="202" y="45" width="148" height="312" fill={`url(#${id("cyan-glow")})`} />
            <path d="M184 49C252 32 302 63 318 102c21 50-1 76-40 101-33 21-62 40-68 72-7 35 29 58 26 103h-49V49Z" fill="#111234" />
            <path d="M196 99c19-23 45-33 68-25 27 9 29 33 6 57-21 23-50 38-59 69-10 34 14 58 48 78 27 17 51 44 42 80h65V73c-23-8-53-18-84-18-36 0-65 16-86 44Z" fill={`url(#${id("ribbon-main")})`} />
            <path d="M196 100c26-22 51-26 68-17 21 12 16 33-7 54-22 19-39 30-48 55-14 39 11 66 51 89 25 14 41 34 43 60 8-39-7-67-43-89-35-21-45-41-31-65 12-23 39-36 56-59 20-28 10-56-20-63-25-6-50 7-69 35Z" fill={`url(#${id("ribbon-light")})`} />
            <path d="M203 224c5 31 34 50 62 66 28 17 42 39 37 69h-99V224Z" fill={`url(#${id("ribbon-bottom")})`} />
            <path d="M221 193c-15 33 9 58 41 78 31 18 48 47 41 79" stroke="#C4BCFF" strokeOpacity=".56" strokeWidth=".75" />
            <path d="M266 78c21 10 23 31 1 55-18 20-44 36-52 56" stroke="#E1E1FF" strokeOpacity=".4" strokeWidth=".65" />
            <path d="M326 45c-5 14-5 28 0 44 11 38 6 66-15 92 32-19 44-52 39-89V45h-24Z" fill="#86D5EB" fillOpacity=".12" />
            <rect x="202" y="45" width="148" height="312" fill={`url(#${id("glass-reflection")})`} />
          </g>
          <rect x="249" y="53" width="54" height="15.5" rx="7.75" fill="#020309" />
          <circle cx="294" cy="60.8" r="3.5" fill="#090B15" />
          <circle cx="294" cy="60.8" r="1.8" fill="#111A31" />
          <circle cx="293.5" cy="60.3" r=".6" fill="#53739C" fillOpacity=".7" />
          <path d="M254 347.1h44" stroke="#F4EFFE" strokeWidth="3.2" strokeOpacity=".76" strokeLinecap="round" />
          <path d="M210 44.6c3.4-2 8.3-3.3 14.5-3.3H328c8.4 0 14.2 2.4 18 6.5" stroke="#F5EFFD" strokeOpacity=".37" strokeWidth=".65" strokeLinecap="round" />
          <path d="M354.9 77V321" stroke="#E4DAEF" strokeOpacity=".22" strokeWidth=".6" />
          <path d="M197.1 91v216" stroke="#E9E2F3" strokeOpacity=".12" strokeWidth=".65" />
        </g>
      </svg>
    </div>
  );
}
