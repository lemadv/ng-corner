import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Import Prism.js configuration for syntax highlighting
import './app/config/prism.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
