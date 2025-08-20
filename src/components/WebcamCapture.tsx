'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Character from './Character';

interface WebcamCaptureProps {
  width?: number;
  height?: number;
  className?: string;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ 
  width = 640, 
  height = 480, 
  className = '' 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<cocoSsd.DetectedObject[]>([]);
  const [characterPose, setCharacterPose] = useState({
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
    headTilt: 0,
    bodyLean: 0
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [avatarMode, setAvatarMode] = useState(true); // 테스트를 위해 기본값을 true로 설정
  const [personDetected, setPersonDetected] = useState<cocoSsd.DetectedObject | null>(null);
  const [previousPersonPosition, setPreviousPersonPosition] = useState<cocoSsd.DetectedObject | null>(null);
  const previousPersonRef = useRef<cocoSsd.DetectedObject | null>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height }
          },
          audio: false
        });
        
        setStream(mediaStream);
        setIsLoading(false);
        
      } catch (err) {
        console.error('웹캠 접근 오류:', err);
        setError(`웹캠에 접근할 수 없습니다: ${err.message}`);
        setIsLoading(false);
      }
    };

    startWebcam();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [width, height]);

  // 스트림이 설정되면 비디오 요소에 할당
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // TensorFlow.js 모델 로드
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        console.log('COCO-SSD 모델 로드 완료');
      } catch (err) {
        console.error('모델 로드 실패:', err);
      }
    };
    loadModel();
  }, []);

  // 마우스 위치 기반 캐릭터 제어 (포즈 감지 대신 임시 구현)
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = videoRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
      
      // 마우스 위치에 따른 캐릭터 포즈 변경
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const leftArmAngle = Math.max(-45, Math.min(45, (x - centerX) / 5));
      const rightArmAngle = Math.max(-45, Math.min(45, (centerX - x) / 5));
      const headTilt = Math.max(-30, Math.min(30, (x - centerX) / 10));
      const bodyLean = Math.max(-20, Math.min(20, (x - centerX) / 15));
      
      setCharacterPose({
        leftArm: leftArmAngle,
        rightArm: rightArmAngle,
        leftLeg: Math.max(-20, Math.min(20, (y - centerY) / 10)),
        rightLeg: Math.max(-20, Math.min(20, (centerY - y) / 10)),
        headTilt: headTilt,
        bodyLean: bodyLean
      });
    }
  };

  // 키보드 이벤트로 캐릭터 제어 (주석 처리)
  /*
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key.toLowerCase()) {
        case 'w': // 팔 올리기
          setCharacterPose(prev => ({ ...prev, leftArm: -45, rightArm: -45 }));
          break;
        case 's': // 팔 내리기
          setCharacterPose(prev => ({ ...prev, leftArm: 45, rightArm: 45 }));
          break;
        case 'a': // 왼쪽 기울기
          setCharacterPose(prev => ({ ...prev, headTilt: -30, bodyLean: -20 }));
          break;
        case 'd': // 오른쪽 기울기
          setCharacterPose(prev => ({ ...prev, headTilt: 30, bodyLean: 20 }));
          break;
        case 'q': // 점프 동작
          setCharacterPose(prev => ({ ...prev, leftLeg: -30, rightLeg: -30 }));
          break;
        case 'e': // 기본 자세
          setCharacterPose({ leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, headTilt: 0, bodyLean: 0 });
          break;
      }
    };

    const handleKeyUp = () => {
      // 키를 떼면 기본 자세로 복귀
      setTimeout(() => {
        setCharacterPose({ leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, headTilt: 0, bodyLean: 0 });
      }, 200);
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  */

  // 사람의 움직임을 분석해서 포즈 업데이트
  const analyzePoseFromMovement = (currentPerson: cocoSsd.DetectedObject) => {
    if (!previousPersonRef.current) {
      previousPersonRef.current = currentPerson;
      setPreviousPersonPosition(currentPerson);
      return;
    }

    const [prevX, prevY, prevW, prevH] = previousPersonRef.current.bbox;
    const [currX, currY, currW, currH] = currentPerson.bbox;

    // 중심점 계산
    const prevCenterX = prevX + prevW / 2;
    const prevCenterY = prevY + prevH / 2;
    const currCenterX = currX + currW / 2;
    const currCenterY = currY + currH / 2;

    // 움직임 계산
    const deltaX = currCenterX - prevCenterX;
    const deltaY = currCenterY - prevCenterY;
    const deltaW = currW - prevW;
    const deltaH = currH - prevH;


    // 포즈 변화 계산 (매우 민감하게 + 다양한 움직임)
    const sensitivity = 8;

    // 좌우 움직임 -> 몸 기울기와 팔 움직임
    const bodyLean = Math.max(-60, Math.min(60, deltaX * sensitivity));
    const sideArmMovement = Math.max(-45, Math.min(45, deltaX * sensitivity * 0.7));
    
    // 상하 움직임 -> 다리 움직임과 팔 높이
    const legMovement = Math.max(-50, Math.min(20, -deltaY * sensitivity));
    const verticalArmMovement = Math.max(-60, Math.min(30, -deltaY * sensitivity * 0.8));
    
    // 크기 변화 -> 팔 벌리기/모으기
    const sizeArmMovement = Math.max(-30, Math.min(30, deltaW * sensitivity * 2));
    
    // 높이 변화 -> 머리 기울기
    const headTilt = Math.max(-45, Math.min(45, deltaH * sensitivity));

    // 팔 움직임 합성 (여러 요소 조합)
    const leftArmFinal = verticalArmMovement + sideArmMovement + sizeArmMovement;
    const rightArmFinal = verticalArmMovement - sideArmMovement + sizeArmMovement;


    // 즉시 포즈 업데이트 (실시간 반응)
    const newPose = {
      leftArm: Math.max(-75, Math.min(75, leftArmFinal)),
      rightArm: Math.max(-75, Math.min(75, rightArmFinal)),
      leftLeg: legMovement,
      rightLeg: legMovement,
      headTilt: headTilt,
      bodyLean: bodyLean
    };
    
    setCharacterPose(newPose);

    // 현재 위치를 이전 위치로 저장
    previousPersonRef.current = currentPerson;
    setPreviousPersonPosition(currentPerson);

  };

  // 물체 감지 시 실행할 동작들
  const handleObjectDetection = () => {
    console.log('다른 물체 감지됨!');
    
    // 방법 1: 북마크 추가 안내 메시지
    if (confirm('다른 물체가 감지되었습니다!\n이 페이지를 북마크에 추가하시겠습니까?')) {
      // 사용자가 수동으로 Ctrl+D를 누르도록 안내
      alert('Ctrl+D를 눌러 북마크를 추가해주세요');
    }
    
    // 방법 2: 새 탭으로 특정 페이지 열기 (Ctrl+T와 유사한 효과)
    // window.open('https://example.com', '_blank');
    
    // 방법 3: 페이지 새로고침 (Ctrl+R과 유사한 효과) 
    // window.location.reload();
    
    // 방법 4: 브라우저 히스토리 뒤로 가기 (Alt+← 과 유사한 효과)
    // window.history.back();
  };

  // 아바타 화면 그리기 (빈 화면)
  const drawAvatarScreen = (predictions: cocoSsd.DetectedObject[]) => {
    if (avatarCanvasRef.current) {
      const canvas = avatarCanvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // 아바타 캔버스 크기 설정
        canvas.width = 800;
        canvas.height = 600;
        
        // 배경 그리기
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB'); // 하늘색
        gradient.addColorStop(1, '#98FB98'); // 연한 녹색
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 사람 감지
        const persons = predictions.filter(prediction => 
          prediction.class === 'person' && prediction.score > 0.5
        );
        
        // 사람 감지 상태만 업데이트 (화면에는 아무것도 그리지 않음)
        if (avatarMode) {
          if (persons.length > 0) {
            const person = persons[0];
            setPersonDetected(person);
            
            // 움직임 분석 및 포즈 업데이트
            analyzePoseFromMovement(person);
          } else {
            setPersonDetected(null);
          }
        } else {
          setPersonDetected(persons.length > 0 ? persons[0] : null);
        }
      }
    }
  };

  // 웹캠 오버레이 그리기
  const drawWebcamOverlay = (predictions: cocoSsd.DetectedObject[]) => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 캔버스 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 물체 감지 박스 그리기
        const nonPersonObjects = predictions.filter(prediction => 
          prediction.class !== 'person' && prediction.score > 0.5
        );

        nonPersonObjects.forEach(prediction => {
          const [x, y, width, height] = prediction.bbox;
          
          // 빨간색 바운딩 박스
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);
          
          // 라벨 배경
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(x, y - 20, width, 20);
          
          // 라벨 텍스트
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(
            `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
            x + 2, y - 5
          );
        });

        // 사람 감지 표시 (아바타 모드일 때만)
        if (avatarMode) {
          const persons = predictions.filter(prediction => 
            prediction.class === 'person' && prediction.score > 0.5
          );
          
          persons.forEach(person => {
            const [x, y, width, height] = person.bbox;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, width, height);
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px Arial';
            ctx.fillText('👤 추적중', x, y - 5);
          });
        }
      }
    }
  };

  // 큰 캐릭터 그리기 (아바타 화면용)
  const drawLargeCharacter = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
    ctx.save();
    
    // 그림자 효과
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    const headRadius = size * 0.15;
    const bodyLength = size * 0.6;
    const armLength = size * 0.4;
    const legLength = size * 0.5;
    
    // 머리
    ctx.beginPath();
    ctx.arc(centerX, centerY - size * 0.3, headRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 얼굴 표정
    ctx.fillStyle = '#000000';
    ctx.shadowBlur = 0;
    
    // 눈
    ctx.beginPath();
    ctx.arc(centerX - headRadius * 0.4, centerY - size * 0.35, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + headRadius * 0.4, centerY - size * 0.35, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // 입 (포즈에 따라 표정 변화)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (characterPose.leftArm < -20 || characterPose.rightArm < -20) {
      // 팔을 올렸을 때 웃는 얼굴
      ctx.arc(centerX, centerY - size * 0.25, 8, 0, Math.PI);
    } else {
      // 기본 표정
      ctx.arc(centerX, centerY - size * 0.27, 5, 0, Math.PI);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 10;
    
    // 몸통 (더 명확한 기울기)
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size * 0.1);
    const bodyLeanOffset = characterPose.bodyLean * 2; // 기울기 2배 확대
    ctx.lineTo(centerX + bodyLeanOffset, centerY + size * 0.3);
    ctx.stroke();
    
    
    // 팔
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 6;
    
    // 팔 각도를 더 명확하게 (기본 각도 + 움직임)
    const baseAngle = Math.PI / 4; // 45도
    const leftArmAngle = baseAngle + (characterPose.leftArm * Math.PI) / 180;
    const rightArmAngle = baseAngle + (characterPose.rightArm * Math.PI) / 180;
    
    
    // 왼쪽 팔
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX - armLength * Math.cos(leftArmAngle),
      centerY + armLength * Math.sin(leftArmAngle)
    );
    ctx.stroke();
    
    // 오른쪽 팔
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + armLength * Math.cos(rightArmAngle),
      centerY + armLength * Math.sin(rightArmAngle)
    );
    ctx.stroke();
    
    // 다리
    ctx.strokeStyle = '#4ECDC4';
    const leftLegAngle = (characterPose.leftLeg * Math.PI) / 180;
    const rightLegAngle = (characterPose.rightLeg * Math.PI) / 180;
    
    // 왼쪽 다리
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY + size * 0.3);
    ctx.lineTo(
      centerX - 10 - legLength * Math.sin(leftLegAngle),
      centerY + size * 0.3 + legLength * Math.cos(leftLegAngle)
    );
    ctx.stroke();
    
    // 오른쪽 다리
    ctx.beginPath();
    ctx.moveTo(centerX + 10, centerY + size * 0.3);
    ctx.lineTo(
      centerX + 10 - legLength * Math.sin(rightLegAngle),
      centerY + size * 0.3 + legLength * Math.cos(rightLegAngle)
    );
    ctx.stroke();
    
    // 장식 효과
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX - headRadius * 0.3, centerY - size * 0.4, headRadius * 0.2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
  };

  // 물체 감지 및 분석
  useEffect(() => {
    if (!model || !stream) return;

    const detectObjects = async () => {
      if (videoRef.current) {
        const video = videoRef.current;

        if (video.readyState >= 2) {
          const detectedPredictions = await model.detect(video);
          
          // 사람(person) 이외의 물체 필터링
          const nonPersonObjects = detectedPredictions.filter(prediction => 
            prediction.class !== 'person' && prediction.score > 0.5
          );

          const objectNames = nonPersonObjects.map(obj => obj.class);
          setDetectedObjects(objectNames);
          setPredictions(detectedPredictions);
          
          // 웹캠 오버레이 그리기
          drawWebcamOverlay(detectedPredictions);
          
          // 아바타 화면 그리기  
          drawAvatarScreen(detectedPredictions);

          // 사람 이외의 물체가 감지되면 동작 실행
          // if (nonPersonObjects.length > 0) {
          //   handleObjectDetection();
          // }
        }
      }
    };

    const interval = setInterval(detectObjects, 100); // 0.1초마다 감지 (더 빠른 반응)
    return () => clearInterval(interval);
  }, [model, stream]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 rounded-lg ${className}`} 
           style={{ width, height }}>
        <div className="text-gray-600">웹캠을 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-100 border border-red-400 text-red-700 rounded-lg ${className}`} 
           style={{ width, height }}>
        <div className="text-center p-4">
          <p className="font-semibold">오류</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* 아바타 메인 화면 */}
      <div className="relative">
        <h3 className="text-xl font-bold mb-2 text-center">🤖 아바타 화면</h3>
        <canvas
          ref={avatarCanvasRef}
          width={800}
          height={600}
          className="rounded-lg shadow-xl border-4 border-blue-300"
          style={{ 
            width: 800,
            height: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        />
        <button 
          onClick={() => {
            console.log('버튼 클릭됨, 현재 아바타 모드:', avatarMode);
            setAvatarMode(!avatarMode);
            console.log('아바타 모드 변경 후:', !avatarMode);
          }}
          className={`absolute top-8 right-4 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 ${
            avatarMode ? 'bg-green-500 hover:bg-green-600 shadow-green-300' : 'bg-purple-500 hover:bg-purple-600 shadow-purple-300'
          } shadow-lg`}
        >
          {avatarMode ? '🤖 아바타 ON' : '👤 아바타 OFF'}
        </button>
        {personDetected && avatarMode && (
          <div className="absolute top-8 left-4 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg">
            ✅ 실시간 추적 중
          </div>
        )}
      </div>

      {/* 웹캠 모니터링 화면 (작게) */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <h4 className="text-sm font-semibold mb-2 text-center">📹 웹캠 모니터</h4>
          <video
            ref={videoRef}
            width={320}
            height={240}
            autoPlay
            playsInline
            muted
            className="rounded-lg shadow-lg cursor-crosshair border-2 border-gray-300"
            onMouseMove={handleMouseMove}
          />
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="absolute top-0 left-0 rounded-lg pointer-events-none"
            style={{ 
              width: 320,
              height: 240 
            }}
          />
          {detectedObjects.length > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
              감지: {detectedObjects.join(', ')}
            </div>
          )}
          {model && (
            <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
              AI 활성
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default WebcamCapture;