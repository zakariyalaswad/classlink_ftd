import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-calendar',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-extrabold capitalize">{{ title() }}</h1>
      <div class="flex gap-2">
        <button class="btn-light" (click)="shift(-1)">‹</button>
        <button class="btn-light" (click)="today()">Aujourd'hui</button>
        <button class="btn-light" (click)="shift(1)">›</button>
      </div>
    </div>
    <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-1">
      @for (d of dayNames; track d) { <div>{{ d }}</div> }
    </div>
    <div class="grid grid-cols-7 gap-1">
      @for (c of cells(); track $index) {
        <button (click)="selected.set(c.key)" [disabled]="!c.day || c.key === selected()"
          class="min-h-16 rounded-xl border text-left p-1.5 text-xs transition-colors"
          [class]="c.key === selected() ? 'border-blue-500 bg-blue-50 cursor-default' : 'border-slate-200 bg-white hover:bg-slate-50'">
          <span [class]="c.today ? 'bg-blue-600 text-white rounded-full px-1.5' : ''">{{ c.day || '' }}</span>
          @if (c.count) { <span class="block mt-1 text-[10px] font-bold text-orange-700">{{ c.count }} devoir(s)</span> }
        </button>
      }
    </div>
    <section class="card mt-4">
      <h2 class="font-bold mb-2">Échéances du jour</h2>
      @for (a of selectedItems(); track a.id) {
        <a [routerLink]="['/classes', a.classeId]" class="block py-1 text-sm hover:text-blue-700">
          <span class="font-semibold">{{ a.titre }}</span>
          <span class="text-xs text-slate-500"> · {{ store.className(a.classeId) }} · {{ a.dateLimite | date: 'HH:mm' }}</span>
        </a>
      } @empty { <p class="text-sm text-slate-500">Aucune échéance.</p> }
    </section>
  `,
})
export class CalendarComponent {
  readonly store = inject(StoreService);
  readonly dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  private static key(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  selected = signal(CalendarComponent.key(new Date()));

  private byDay = computed(() => {
    const m = new Map<string, ReturnType<StoreService['assignments']>>();
    for (const a of this.store.assignments()) {
      if (!a.dateLimite) continue;
      const k = CalendarComponent.key(new Date(a.dateLimite));
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  });

  cells = computed(() => {
    const first = this.month();
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const todayKey = CalendarComponent.key(new Date());
    const out: { day: number; key: string; count: number; today: boolean }[] = [];
    for (let i = 0; i < lead; i++) out.push({ day: 0, key: '', count: 0, today: false });
    for (let d = 1; d <= days; d++) {
      const key = CalendarComponent.key(new Date(first.getFullYear(), first.getMonth(), d));
      out.push({ day: d, key, count: this.byDay().get(key)?.length ?? 0, today: key === todayKey });
    }
    return out;
  });

  title = computed(() => this.month().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  selectedItems = computed(() => this.byDay().get(this.selected()) ?? []);

  shift(n: number): void { const m = this.month(); this.month.set(new Date(m.getFullYear(), m.getMonth() + n, 1)); }
  today(): void { const n = new Date(); this.month.set(new Date(n.getFullYear(), n.getMonth(), 1)); this.selected.set(CalendarComponent.key(n)); }
}