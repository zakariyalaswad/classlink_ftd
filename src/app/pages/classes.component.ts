import { Component } from '@angular/core';
import { HomeComponent } from './home.component';

@Component({
  selector: 'app-classes',
  imports: [HomeComponent],
  template: `<app-home />`,
})
export class ClassesComponent {}
