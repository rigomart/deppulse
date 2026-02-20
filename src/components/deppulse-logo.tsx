import type { SVGProps } from "react";

const PULSE_PATH_LENGTH = 450;

export const DeppulseIcon = ({ ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="20 35 200 170"
      fill="none"
      {...props}
    >
      <title>Deppulse Logo</title>
      <style>
        {`
          @keyframes draw-pulse {
            from { stroke-dashoffset: ${PULSE_PATH_LENGTH}; }
            to { stroke-dashoffset: 0; }
          }
          .pulse-line {
            stroke-dasharray: ${PULSE_PATH_LENGTH};
            stroke-dashoffset: ${PULSE_PATH_LENGTH};
            animation: draw-pulse 1.2s ease-out 0.3s forwards;
          }
        `}
      </style>
      <g
        stroke="currentColor"
        fill="currentColor"
        opacity={0.4}
        strokeWidth={3}
      >
        <path fill="none" d="m120 50 60 35v70l-60 35-60-35V85l60-35" />
        <path d="M120 50v70m60-35-60 35m60 35-60-35m0 70v-70m-60 35 60-35M60 85l60 35" />
        <circle cx={120} cy={50} r={7} />
        <circle cx={180} cy={85} r={7} />
        <circle cx={180} cy={155} r={7} />
        <circle cx={120} cy={190} r={7} />
        <circle cx={60} cy={155} r={7} />
        <circle cx={60} cy={85} r={7} />
        <circle cx={120} cy={120} r={10} />
      </g>
      <path
        className="pulse-line"
        d="M30 120h55l15-65 20 130 20-100 15 35h55"
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
