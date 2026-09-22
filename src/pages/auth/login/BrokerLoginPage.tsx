import AuthHeader from '@components/header/authHeader/AuthHeader';
import BrokerLoginForm from '@features/auth/login/BrokerLoginForm';

function BrokerLoginPage() {
  return (
    <>
      <AuthHeader title="Broker Portal Sign In" />
      <BrokerLoginForm />
    </>
  );
}

export default BrokerLoginPage;
