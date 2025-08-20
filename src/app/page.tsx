import WebcamCapture from '@/components/WebcamCapture';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI 웹캠 인터랙션
          </h1>
          <p className="text-gray-600">
            당신의 움직임을 따라하는 캐릭터와 물체 감지 기능
          </p>
        </div>
        
        <div className="flex justify-center gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">웹캠</h2>
            <WebcamCapture 
              width={640} 
              height={480} 
              className="mx-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
