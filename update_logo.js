const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'pages');

const filesToUpdate = [
  { file: 'UserDashboard.jsx', level: 1 },
  { file: 'ScrapPage.jsx', level: 1 },
  { file: 'RndPage.jsx', level: 1 },
  { file: 'RndDashboard.jsx', level: 1 },
  { file: 'ReworkPlanPage.jsx', level: 1 },
  { file: 'ReworkPage.jsx', level: 1 },
  { file: 'ReworkListPage.jsx', level: 1 },
  { file: 'PlanPage.jsx', level: 1 },
  { file: 'ConfirmPage.jsx', level: 1 },
  { file: 'admin/AdminLayout.jsx', level: 2 }
];

filesToUpdate.forEach(({ file, level }) => {
  const fullPath = path.join(srcDir, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Add import if not present
  if (!content.includes("import logo from")) {
    const importStr = `import logo from '${level === 1 ? '../assets/logo.jpg' : '../../assets/logo.jpg'}';\n`;
    content = content.replace(/(import .*?;?\n)/, `$1${importStr}`);
  }

  // Replace logo html
  // Usually it is `<div className="navbar-logo">◇</div>`
  content = content.replace(/<div className="navbar-logo">\s*◇\s*<\/div>/g, '<div className="navbar-logo"><img src={logo} alt="Logo" /></div>');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${file}`);
});
