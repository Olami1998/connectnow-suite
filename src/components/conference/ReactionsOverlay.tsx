import { Reaction } from '@/types/conference';

interface ReactionsOverlayProps {
  reactions: Reaction[];
}

export function ReactionsOverlay({ reactions }: ReactionsOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {reactions.map((reaction) => {
        const randomX = Math.random() * 80 + 10; // 10-90% from left
        
        return (
          <div
            key={reaction.id}
            className="reaction-float"
            style={{
              left: `${randomX}%`,
              bottom: '20%',
            }}
          >
            {reaction.emoji}
          </div>
        );
      })}
    </div>
  );
}
