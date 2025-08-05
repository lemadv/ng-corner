// Prism.js configuration for syntax highlighting
import 'prismjs';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-highlight/prism-line-highlight';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';
import 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace';

// Load commonly used languages
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-markup'; // HTML/XML markup
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-nginx';

// Load CSS themes
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-highlight/prism-line-highlight.css';

declare global {
  interface Window {
    Prism: any;
  }
}

// Configure plugins
if (typeof window !== 'undefined' && window.Prism) {
  // Configure normalize whitespace
  window.Prism.plugins.NormalizeWhitespace.setDefaults({
    'remove-trailing': true,
    'remove-indent': true,
    'left-trim': true,
    'right-trim': true,
    'break-lines': 100,
    'indent': 2,
    'remove-initial-line-feed': true,
    'tabs-to-spaces': 2,
    'spaces-to-tabs': 0
  });
}

export const PRISM_CONFIG = {
  languages: [
    'typescript',
    'javascript',
    'json',
    'css',
    'scss',
    'markup', // HTML/XML
    'markdown',
    'bash',
    'shell-session',
    'powershell',
    'python',
    'java',
    'csharp',
    'php',
    'sql',
    'yaml',
    'docker',
    'nginx'
  ],
  plugins: [
    'line-numbers',
    'line-highlight',
    'copy-to-clipboard',
    'normalize-whitespace'
  ],
  theme: 'prism-tomorrow'
};
