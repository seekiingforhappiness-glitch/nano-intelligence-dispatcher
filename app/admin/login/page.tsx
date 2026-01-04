import { LoginForm } from './LoginForm';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient">纳米智能排线助手</h1>
          <p className="text-dark-400 mt-2">后台管理</p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-dark-500 mt-6">
          首次部署请设置环境变量 ADMIN_BOOTSTRAP_PASSWORD 以自动创建初始管理员账号
        </p>
      </div>
    </div>
  );
}


