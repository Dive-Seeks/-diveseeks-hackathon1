'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { getCookie } from 'cookies-next';

interface SkillManifest {
  name: string;
  domain: string | null;
  description: string;
  targetRoles: string[];
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillManifest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const token = getCookie('accessToken');
        const res = await fetch('http://localhost:7771/api/workforce/skills/scan', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSkills(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Skills</h1>
        <p className="text-muted-foreground">Markdown-based instructions loaded into the Agent&apos;s Soul.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {skills.map((skill) => (
          <Card key={skill.name}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{skill.name}</CardTitle>
                <Badge>{skill.domain || 'Global'}</Badge>
              </div>
              <CardDescription>{skill.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {skill.targetRoles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {skill.targetRoles.map(role => (
                    <Badge key={role} variant="outline">{role}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
