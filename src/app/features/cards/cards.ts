import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CardService } from '../../core/services/card.service';
import { ToastService } from '../../core/services/toast.service';
import { DebitCard } from '../../core/models/card.model';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './cards.html',
  styleUrl: './cards.scss',
})
export class CardsComponent implements OnInit {
  private cardSvc = inject(CardService);
  private toast   = inject(ToastService);
  private fb      = inject(FormBuilder);

  cards       = this.cardSvc.myCards;
  selectedId  = signal<string | null>(null);
  saving      = signal(false);
  reportingId = signal<string | null>(null);

  limitForm = this.fb.group({
    dailyLimit: [0, [Validators.required, Validators.min(0)]],
    atmLimit:   [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const c = this.cards();
    if (c.length) this.selectCard(c[0]);
  }

  selectCard(card: DebitCard): void {
    this.selectedId.set(card.id);
    this.limitForm.patchValue({ dailyLimit: card.dailyLimit, atmLimit: card.atmLimit });
  }

  selectedCard(): DebitCard | undefined {
    return this.cards().find(c => c.id === this.selectedId());
  }

  toggleFreeze(card: DebitCard): void {
    this.cardSvc.toggleFreeze(card.id);
    const isFrozen = this.cards().find(c => c.id === card.id)?.status === 'frozen';
    this.toast.info(isFrozen ? 'Card frozen. Transactions will be declined.' : 'Card unfrozen. Transactions are enabled.');
  }

  saveLimits(): void {
    if (this.limitForm.invalid || !this.selectedId()) return;
    this.saving.set(true);
    setTimeout(() => {
      const v = this.limitForm.value;
      this.cardSvc.updateLimits(this.selectedId()!, v.dailyLimit!, v.atmLimit!);
      this.saving.set(false);
      this.toast.success('Spending limits updated.');
    }, 600);
  }

  toggleSetting(cardId: string, key: keyof DebitCard): void {
    const card = this.cards().find(c => c.id === cardId);
    if (!card) return;
    this.cardSvc.updateSettings(cardId, { [key]: !card[key] });
  }

  reportLost(cardId: string): void {
    this.reportingId.set(cardId);
    setTimeout(() => {
      this.cardSvc.reportLost(cardId);
      this.reportingId.set(null);
      this.toast.warning('Card reported lost/stolen. A replacement will be mailed within 5-7 business days.');
    }, 1000);
  }

  networkClass(network: string): string {
    return network === 'Visa' ? 'card-visa' : 'card-mc';
  }

  expiryStr(card: DebitCard): string {
    return `${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`;
  }
}
