import Head from 'next/head';
import Layout from '../components/Layout';
import ActivityPage from '../components/ActivityPage';

export default function Activity() {
  return (
    <>
      <Head>
        <title>Activity · asentum</title>
      </Head>
      <Layout>
        <ActivityPage />
      </Layout>
    </>
  );
}
