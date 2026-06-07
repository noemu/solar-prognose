import React from "react";
import { Compass } from "./Compass";
import { InclinationBar } from "./InclinationBar";

const LIVE_COMPASS_SIZE_CLASS = "max-w-[clamp(120px,42vw,220px)]";
const LIVE_INCLINATION_HEIGHT_CLASS = "h-[clamp(120px,42vw,220px)]";

const formatNumber = (value: number, suffix: string) =>
  `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
  }).format(value)} ${suffix}`;

interface LiveAlignmentPreviewProps {
  currentPitch: number;
  currentHeading: number;
  isAccurate: boolean;
  headingSuffix?: string;
  pitchSuffix?: string;
}

export const LiveAlignmentPreview: React.FC<LiveAlignmentPreviewProps> = ({
  currentPitch,
  currentHeading,
  isAccurate,
  headingSuffix = "°",
  pitchSuffix = "°",
}) => (
  <div className="mt-5 grid items-center gap-4 grid-cols-[106px_minmax(0,1fr)] sm:gap-4">
    <div className="flex flex-col items-center gap-2">
      <div className={`${LIVE_INCLINATION_HEIGHT_CLASS} w-full`}>
        <InclinationBar currentPitch={currentPitch} />
      </div>
      <div className="text-sm font-medium text-slate-600">
        {formatNumber(currentPitch, pitchSuffix)}
      </div>
    </div>

    <div className="flex min-w-0 flex-col items-center justify-center gap-3">
      <Compass
        currentHeading={currentHeading}
        targetAzimuth={0}
        isAccurate={isAccurate}
        showTarget={false}
        sizeClassName={LIVE_COMPASS_SIZE_CLASS}
      />
      <div className="text-sm font-medium text-slate-600">
        {formatNumber(currentHeading, headingSuffix)}
      </div>
    </div>
  </div>
);
