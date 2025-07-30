import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Message } from '../types';

const MAX_QUESTION_LENGTH = 100;

export const useMessages = (since?: number) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    let q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    if (since) {
      q = query(messagesRef, 
        where('timestamp', '>', Timestamp.fromMillis(since)),
        orderBy('timestamp', 'asc')
      );
    }

    console.log('Setting up Firestore listener...');

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('Firestore snapshot received, docs:', snapshot.size);
        const newMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newMessages.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toMillis() || Date.now()
          } as Message);
        });
        setMessages(newMessages);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore listener error:', err);
        
        if (err.code === 'permission-denied') {
          console.log('Permission denied - this is normal for a new database. Rules may still be propagating.');
          setError('Connecting to database... Please wait a moment and refresh the page.');
          
          // Try again in 5 seconds
          setTimeout(() => {
            console.log('Retrying Firestore connection...');
            window.location.reload();
          }, 5000);
        } else {
          setError(`Database error: ${err.message}`);
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up Firestore listener');
      unsubscribe();
    };
  }, [since]);

  const addMessage = async (name: string, question: string) => {
    try {
      // Client-side validation
      if (question.length > MAX_QUESTION_LENGTH) {
        throw new Error(`Question must be ${MAX_QUESTION_LENGTH} characters or less. Current: ${question.length} characters.`);
      }

      console.log('Adding message to Firestore...');
      const docRef = await addDoc(collection(db, 'messages'), {
        name,
        question,
        timestamp: serverTimestamp(),
        isFromStuart: false,
        read: false,
        questionLength: question.length
      });
      console.log('Message added with ID:', docRef.id);
      
      // Send SMS notification after successful Firestore save
      try {
        console.log('Sending SMS notification...');
        const response = await fetch('https://soft-churros-2d1223.netlify.app/.netlify/functions/messages-post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            question,
            hp_field: '' // Empty honeypot for legitimate requests
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('SMS notification result:', result.smsStatus);
        } else {
          console.warn('SMS notification failed:', response.status);
        }
      } catch (smsError) {
        console.warn('SMS notification error:', smsError);
        // Don't fail the whole operation if SMS fails
      }
      
      return docRef.id;
      
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  };

  return { messages, loading, error, addMessage };
};
