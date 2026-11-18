import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { DEADLINES } from '../../core/data/demo-data';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page">
      <div class="pageTitle">
        <div>
          <p class="eyebrow">ESPACE PERSONNEL</p>
          <h1>Bonjour Camille,<br /><span>prête à apprendre ?</span></h1>
          <p>Retrouvez vos classes, vos échéances et reprenez là où vous vous étiez arrêtée.</p>
        </div>
        <div class="titleActions">
          <button class="btn secondary" type="button" (click)="state.modal.set('join')">
            <app-icon name="plus" [size]="17" />Rejoindre une classe
          </button>
          <button class="btn" type="button" (click)="state.modal.set('create')">
            <app-icon name="plus" [size]="17" />Créer une classe
          </button>
        </div>
      </div>

      <div class="dashboardGrid">
        <section>
          <div class="sectionHead">
            <div>
              <h2>Mes classes</h2>
              <p>4 classes actives ce semestre</p>
            </div>
            <div class="search">
              <app-icon name="search" [size]="18" />
              <input
                aria-label="Rechercher une classe"
                placeholder="Rechercher une classe..."
                [ngModel]="state.search()"
                (ngModelChange)="state.search.set($event)"
              />
            </div>
          </div>

          <div class="classGrid">
            @for (c of state.filteredClasses(); track c.id) {
              <article class="classCard" tabindex="0" (click)="state.openClass(c.role)" (keydown.enter)="state.openClass(c.role)">
                <div [class]="'banner ' + c.color">
                  <span>{{ c.subject }}</span>
                  <button type="button" aria-label="Plus d’options" (click)="$event.stopPropagation()">
                    <app-icon name="more" />
                  </button>
                  <div class="subjectIcon"><app-icon name="book" [size]="23" /></div>
                </div>
                <div class="cardBody">
                  <h3>{{ c.title }}</h3>
                  <p>{{ c.teacher }}</p>
                  <div class="classMeta">
                    <span><app-icon name="users" [size]="16" />{{ c.members }} membres</span>
                    <b><app-icon name="arrow" [size]="16" /></b>
                  </div>
                </div>
              </article>
            }
          </div>

          @if (!state.filteredClasses().length) {
            <div class="empty">
              <app-icon name="search" />
              <h3>Aucune classe trouvée</h3>
              <p>Essayez une autre recherche.</p>
            </div>
          }
        </section>

        <aside class="deadlines">
          <div class="sectionHead">
            <div>
              <h2>À rendre bientôt</h2>
              <p>Vos prochaines échéances</p>
            </div>
            <button type="button">Tout voir</button>
          </div>
          @for (d of deadlines; track d[2]) {
            <div class="deadline">
              <div [class]="'date ' + d[5]"><b>{{ d[0] }}</b><small>{{ d[1] }}</small></div>
              <div>
                <h4>{{ d[2] }}</h4>
                <p>{{ d[3] }}</p>
                <span><app-icon name="clock" [size]="13" />{{ d[4] }}</span>
              </div>
            </div>
          }
          <div class="allGood">
            <app-icon name="check" [size]="18" />
            <div>
              <b>Vous êtes à jour</b>
              <p>Aucun devoir en retard</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  readonly state = inject(ClassLinkStateService);
  readonly deadlines = DEADLINES;
}
