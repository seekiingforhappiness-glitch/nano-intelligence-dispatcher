import Link from 'next/link';

export default function AdminHome() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="任务管理" desc="查看排线任务记录、失败原因与参数快照，支持下载结果。">
        <Link className="text-primary-400 hover:underline" href="/admin/tasks">
          打开任务列表 →
        </Link>
      </Card>
      <Card title="用户管理" desc="为 2-5 个内部人员创建账号、分配角色、重置密码。">
        <Link className="text-primary-400 hover:underline" href="/admin/users">
          打开用户管理 →
        </Link>
      </Card>
      <Card title="后续扩展" desc="地址纠错、车型模板、规则管理会在下一步加入（按你们使用反馈迭代）。">
        <span className="text-dark-400 text-sm">已完成：登录/任务/用户基础框架</span>
      </Card>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-dark-800/40 border border-dark-700 rounded-xl p-5">
      <div className="text-white font-semibold">{title}</div>
      <div className="text-sm text-dark-400 mt-2">{desc}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}


