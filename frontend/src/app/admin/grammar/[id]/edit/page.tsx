'use client';
import { useParams } from 'next/navigation';
import GrammarArticleForm from '@/components/GrammarArticleForm';

export default function EditPage() {
    const { id } = useParams<{ id: string }>();
    return <GrammarArticleForm articleId={Number(id)} />;
}