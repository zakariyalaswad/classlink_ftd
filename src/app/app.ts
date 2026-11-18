import { Component } from '@angular/core';
import { ClassLinkShellComponent } from './features/classlink/classlink-shell.component';

@Component({
  selector: 'app-root',
  imports: [ClassLinkShellComponent],
  template: `<app-classlink-shell />`,
  styles: `:host { display: block; min-height: 100vh; }`,
})
export class App {}
