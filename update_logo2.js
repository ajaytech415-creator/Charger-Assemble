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
    content = importStr + content;
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed import in ${file}`);
  } else {
    console.log(`Import already exists in ${file}`);
  }
});
