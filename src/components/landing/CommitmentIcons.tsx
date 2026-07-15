import { Icon } from '@iconify/react';
import crownThin from '@iconify-icons/ph/crown-thin';
import sealCheckThin from '@iconify-icons/ph/seal-check-thin';
import sparkleThin from '@iconify-icons/ph/sparkle-thin';
import arrowsCounterClockwiseThin from '@iconify-icons/ph/arrows-counter-clockwise-thin';

const COMMITMENTS = [
  { icon: crownThin, title: ['Premium', 'Grade'] },
  { icon: sealCheckThin, title: ['Authentic', 'Certification'] },
  { icon: sparkleThin, title: ['Ethically', 'Sourced'] },
  { icon: arrowsCounterClockwiseThin, title: ['14-Day', 'Returns'] },
];

export function CommitmentIcons() {
  return (
    <div className="wrap commitments">
      {COMMITMENTS.map(({ icon, title }) => (
        <div key={title.join(' ')}>
          <span className="cicon">
            <Icon icon={icon} className="cicon-svg" />
          </span>
          <h3 className="serif">
            {title[0]}
            <br />
            {title[1]}
          </h3>
        </div>
      ))}
    </div>
  );
}
