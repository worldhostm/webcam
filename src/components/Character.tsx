'use client';

import React from 'react';

interface PoseData {
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
  headTilt: number;
  bodyLean: number;
}

interface CharacterProps {
  pose: PoseData;
  className?: string;
}

const Character: React.FC<CharacterProps> = ({ pose, className = '' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* 머리 */}
        <div 
          className="w-12 h-12 bg-yellow-400 rounded-full border-2 border-black mb-2"
          style={{
            transform: `rotate(${pose.headTilt}deg)`
          }}
        >
          {/* 얼굴 */}
          <div className="flex justify-between items-center px-2 pt-2">
            <div className="w-1 h-1 bg-black rounded-full"></div>
            <div className="w-1 h-1 bg-black rounded-full"></div>
          </div>
          <div className="w-2 h-1 bg-black rounded-full mx-auto mt-1"></div>
        </div>

        {/* 몸통 */}
        <div 
          className="w-16 h-20 bg-blue-400 border-2 border-black rounded-lg relative"
          style={{
            transform: `rotate(${pose.bodyLean}deg)`
          }}
        >
          {/* 왼쪽 팔 */}
          <div 
            className="absolute -left-3 top-2 w-2 h-12 bg-pink-300 border border-black rounded-full origin-top"
            style={{
              transform: `rotate(${pose.leftArm}deg)`
            }}
          ></div>

          {/* 오른쪽 팔 */}
          <div 
            className="absolute -right-3 top-2 w-2 h-12 bg-pink-300 border border-black rounded-full origin-top"
            style={{
              transform: `rotate(${pose.rightArm}deg)`
            }}
          ></div>
        </div>

        {/* 다리 */}
        <div className="flex justify-center gap-2 mt-1">
          {/* 왼쪽 다리 */}
          <div 
            className="w-2 h-16 bg-green-400 border border-black rounded-full origin-top"
            style={{
              transform: `rotate(${pose.leftLeg}deg)`
            }}
          ></div>

          {/* 오른쪽 다리 */}
          <div 
            className="w-2 h-16 bg-green-400 border border-black rounded-full origin-top"
            style={{
              transform: `rotate(${pose.rightLeg}deg)`
            }}
          ></div>
        </div>
      </div>

      {/* 캐릭터 상태 표시 */}
      <div className="mt-4 text-center text-sm bg-white bg-opacity-80 rounded p-2">
        <div>팔: L{Math.round(pose.leftArm)}° R{Math.round(pose.rightArm)}°</div>
        <div>다리: L{Math.round(pose.leftLeg)}° R{Math.round(pose.rightLeg)}°</div>
        <div>머리: {Math.round(pose.headTilt)}° 몸: {Math.round(pose.bodyLean)}°</div>
      </div>
    </div>
  );
};

export default Character;