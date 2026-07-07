const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure PageTransition is imported
if (!content.includes('PageTransition')) {
  content = content.replace("import { ErrorBoundary } from './components/ErrorBoundary';", "import { ErrorBoundary } from './components/ErrorBoundary';\nimport PageTransition from './components/PageTransition';");
}

// Replace route elements with PageTransition wrapper
const replacements = [
  ['<Login />', '<PageTransition><Login /></PageTransition>'],
  ['<Home />', '<PageTransition><Home /></PageTransition>'],
  ['<Profile />', '<PageTransition><Profile /></PageTransition>'],
  ['<ProfileRedirect />', '<PageTransition><ProfileRedirect /></PageTransition>'],
  ['<Notifications />', '<PageTransition><Notifications /></PageTransition>'],
  ['<Discussions />', '<PageTransition><Discussions /></PageTransition>'],
  ['<Saved />', '<PageTransition><Saved /></PageTransition>'],
  ['<Colleagues />', '<PageTransition><Colleagues /></PageTransition>'],
  ['<Groups />', '<PageTransition><Groups /></PageTransition>'],
  ['<GroupDetails />', '<PageTransition><GroupDetails /></PageTransition>'],
  ['<Market />', '<PageTransition><Market /></PageTransition>'],
  ['<GameBreak />', '<PageTransition><GameBreak /></PageTransition>'],
  ['<Fitness />', '<PageTransition><Fitness /></PageTransition>'],
  ['<Settings />', '<PageTransition><Settings /></PageTransition>'],
  ['<AdminDashboard />', '<PageTransition><AdminDashboard /></PageTransition>'],
  ['<Privacy />', '<PageTransition><Privacy /></PageTransition>']
];

replacements.forEach(([orig, target]) => {
  // Be careful to only replace inside the element props
  const regex = new RegExp(`element=\\{(!user \\? )?${orig.replace(/\//g, '\\/').replace(/</g, '\\<').replace(/>/g, '\\>')} : (\\<Navigate to="[^"]*" \\/\\>)?\\}`, 'g');
  
  // We can just replace the component instances directly in the file since they are used mostly in Routes
  content = content.replace(new RegExp(orig.replace(/[\/\(\)\<\>]/g, '\\$&'), 'g'), target);
});

// but wait, doing global replace might replace imports or other places if they match exactly `<X />`, let's just do it in the Routes block.
// A safer way is to just do it via regex matching the Route elements.

fs.writeFileSync('src/App.tsx.new', content);
