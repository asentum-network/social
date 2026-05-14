import Head from 'next/head';
import Layout from '../components/Layout';
import FeedPage from '../components/FeedPage';

export default function Home() {
  return (
    <>
      <Head>
        <title>asentum</title>
      </Head>
      <Layout>
        <FeedPage />
      </Layout>
    </>
  );
}
