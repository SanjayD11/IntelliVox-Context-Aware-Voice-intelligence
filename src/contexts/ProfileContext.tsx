import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
}

interface ProfileContextType {
    profile: Profile;
    loading: boolean;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    uploadAvatar: (file: File, onProgress?: (progress: number) => void) => Promise<string | null>;
    displayName: string;
    initials: string;
    refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Initialize from localStorage if available
    const [profile, setProfile] = useState<Profile>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('intellivox_profile');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse saved profile', e);
                }
            }
        }
        return {
            first_name: '',
            last_name: '',
            avatar_url: null,
        };
    });

    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        if (!user) {
            setProfile({ first_name: '', last_name: '', avatar_url: null });
            localStorage.removeItem('intellivox_profile');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, last_name, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
            } else if (data) {
                const newProfile = {
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    avatar_url: data.avatar_url || null,
                };
                setProfile(newProfile);
                localStorage.setItem('intellivox_profile', JSON.stringify(newProfile));
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const updateProfile = useCallback(async (updates: Partial<Profile>) => {
        if (!user) return;

        // Optimistic update
        setProfile(prev => {
            const newProfile = { ...prev, ...updates };
            localStorage.setItem('intellivox_profile', JSON.stringify(newProfile));
            return newProfile;
        });

        const { error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            // Revert on error (fetch fresh)
            fetchProfile();
            throw error;
        }
    }, [user]);

    const uploadAvatar = useCallback(async (file: File, onProgress?: (progress: number) => void): Promise<string | null> => {
        if (!user) return null;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('File too large. Maximum size is 5MB.');
        }

        // Upload to Supabase Storage using Signed URL (for progress support)
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        try {
            // 1. Create signed upload URL
            const { data: uploadData, error: signError } = await supabase.storage
                .from('avatars')
                .createSignedUploadUrl(filePath);

            if (signError) throw signError;
            if (!uploadData?.signedUrl) throw new Error('Failed to get signed upload URL');

            // 2. Upload file using XHR to track progress
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadData.signedUrl);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        onProgress(progress);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });

            // 3. Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            // Fallback to base64 if storage upload fails
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
        }
    }, [user]);

    const displayName = profile.first_name || profile.last_name
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : user?.email?.split('@')[0] || 'User';

    const initials = profile.first_name && profile.last_name
        ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
        : (user?.email?.[0] || 'U').toUpperCase();

    return (
        <ProfileContext.Provider value={{
            profile,
            loading,
            updateProfile,
            uploadAvatar,
            displayName,
            initials,
            refetch: fetchProfile,
        }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
}
