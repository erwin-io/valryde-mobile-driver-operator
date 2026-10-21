import { TestBed } from '@angular/core/testing';

import { StatusPillComponent } from './status-pill.component';

describe('StatusPillComponent', () => {
  it('exposes its semantic tone for status styling', async () => {
    await TestBed.configureTestingModule({ imports: [StatusPillComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StatusPillComponent);
    fixture.componentRef.setInput('tone', 'danger');
    fixture.detectChanges();
    const pill = fixture.nativeElement.querySelector('.status-pill') as HTMLElement;
    expect(pill.dataset['tone']).toBe('danger');
  });
});
