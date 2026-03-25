import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion } from 'motion/react';

interface MapProps {
  onUserClick: (user: UserProfile) => void;
  filterTag: string;
}

export const Map: React.FC<MapProps> = ({ onUserClick, filterTag }) => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hasCentered = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => doc.data() as UserProfile);
        setUsers(usersData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );
    return () => unsubscribe();
  }, []);

  // Center on current user initially
  useEffect(() => {
    if (profile && containerRef.current && !hasCentered.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      setPosition({
        x: containerWidth / 2 - profile.x,
        y: containerHeight / 2 - profile.y,
      });
      hasCentered.current = true;
    }
  }, [profile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]',
      pink: 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)]',
      blue: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]',
      cyan: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]',
      yellow: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]',
    };
    return colorMap[color] || colorMap.purple;
  };

  const filteredUsers = users.filter((u) => {
    if (profile?.blockedUsers?.includes(u.uid)) return false;
    if (u.blockedUsers?.includes(profile?.uid || '')) return false;
    if (filterTag && !u.tags.some(t => t.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    return true;
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#050510] cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute w-[5000px] h-[5000px]"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Grid background for reference */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '50px 50px' }} />
             
        {filteredUsers.map((user) => (
          <motion.div
            key={user.uid}
            className="absolute flex flex-col items-center justify-center group cursor-pointer"
            style={{ left: user.x, top: user.y }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.2 }}
            onClick={(e) => {
              e.stopPropagation();
              onUserClick(user);
            }}
          >
            <div className={`w-4 h-4 rounded-full ${getColorClass(user.color)}`} />
            <div className="mt-2 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 px-2 py-1 rounded-md pointer-events-none">
              {user.nickname || user.username}
            </div>
            {user.signal && (
              <div className="absolute -top-8 text-[10px] text-white/90 bg-white/10 px-2 py-1 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/20">
                {user.signal}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
